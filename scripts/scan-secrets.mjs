#!/usr/bin/env node
/**
 * Secret scanner for staged content.
 *
 * Scans what git is *about to commit* (the index), not the working tree, so
 * a file that is ignored locally but was already tracked still gets caught,
 * and an unstaged edit can never mask a staged secret.
 *
 * Two tiers:
 *   BLOCK  - a real credential. Exit code 1, commit refused.
 *   WARN   - probably intentional (documented demo credentials). Reported,
 *            does not block.
 *
 * Usage:
 *   node scripts/scan-secrets.mjs --staged     scan the git index (used by pre-commit)
 *   node scripts/scan-secrets.mjs --all        scan every tracked file
 *   node scripts/scan-secrets.mjs [--strict]    treat WARN as blocking too
 *
 * No dependencies: this runs on every commit, so it has to be instant and
 * must not itself need an install step.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// git resolution
// ---------------------------------------------------------------------------

/** git is not always on PATH on Windows (e.g. inside some IDE terminals). */
function resolveGit() {
  const candidates = [
    process.env.GIT_EXECUTABLE,
    'git',
    'C:\\Program Files\\Git\\cmd\\git.exe',
    'C:\\Program Files\\Git\\bin\\git.exe',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'ignore' });
      return candidate;
    } catch {
      /* try the next candidate */
    }
  }
  console.error('scan-secrets: could not find a working git executable.');
  process.exit(2);
}

const GIT = resolveGit();

function git(args, opts = {}) {
  return execFileSync(GIT, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
}

const repoRoot = git(['rev-parse', '--show-toplevel']).trim();

// ---------------------------------------------------------------------------
// placeholders
// ---------------------------------------------------------------------------

/**
 * Values that look like credentials but are documentation stand-ins. The
 * repo ships `backend/.env.example` and a README full of these, so they must
 * not trip the scanner.
 */
const PLACEHOLDER =
  /^(?:YOUR|YOUR[_-].*|<.*>|\{\{.*\}\}|\$\{.*\}|x{3,}|X{3,}|\*{3,}|CHANGEME|CHANGE_?ME|PLACEHOLDER|EXAMPLE|DUMMY|FAKE|SAMPLE|REDACTED|REPLACE(ME)?|TODO|NOTREAL|NOTREAL|INSECURE|TEST[_-]?KEY|abc123|password|secret|token|null|undefined|true|false|\d+)$/i;

/**
 * Filler markers checked as substrings, not just whole-value matches. Values
 * like `change_me_to_a_long_random_string` are documentation, and a whole
 * value comparison misses them.
 */
const FILLER = /(?:^|[^a-z0-9])(?:your|changeme|change[_-]?me|placeholder|example|examples|dummy|fake|sample|redacted|replace[_-]?me|replace|notreal|not[_-]?real|insecure|insert|put[_-]?your|some[_-]?secret|random[_-]?string|here[_-]?goes|todo)(?:[^a-z0-9]|$)/i;

function isPlaceholder(value) {
  const v = String(value).trim();
  if (!v) return true;
  if (v.includes('<') || v.includes('>') || v.includes('{{') || v.includes('${')) return true;
  if (PLACEHOLDER.test(v)) return true;
  if (FILLER.test(v)) return true;
  // A run of the same character is filler, not a secret.
  if (/^(.)\1{5,}$/.test(v)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// patterns
// ---------------------------------------------------------------------------

/**
 * BLOCK rules. Each captures the offending value in group 1 where the value
 * itself needs a placeholder check; otherwise the whole match is the secret.
 */
const BLOCK_RULES = [
  {
    name: 'Supabase / JWT API key',
    re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: 'Supabase publishable/secret key (new format)',
    re: /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{16,}/g,
  },
  {
    name: 'private key block',
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
  },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/g },
  {
    name: 'AWS secret access key',
    re: /aws_secret_access_key\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    capture: 1,
  },
  {
    name: 'database URL with inline password',
    re: /\b(?:postgres|postgresql|mongodb(?:\+srv)?|mysql|redis):\/\/[^:@/\s]+:([^@/\s]{3,})@/gi,
    capture: 1,
  },
  {
    name: 'GitHub token',
    re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{25,})\b/g,
  },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{12,}/g },
  { name: 'Stripe live secret key', re: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/g },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: 'npm access token', re: /\bnpm_[A-Za-z0-9]{36}\b/g },
  {
    // The workhorse: KEY=value / "key": "value" where the key name says secret
    // and the value is long enough to be real. Group 1 is the value so it can
    // be placeholder-checked.
    name: 'secret-shaped assignment',
    re: /\b([A-Z0-9_]*(?:SECRET|PASSWORD|PASSWD|API_?KEY|PRIVATE_?KEY|ACCESS_?KEY|TOKEN|CREDENTIAL)[A-Z0-9_]*)\s*[:=]\s*["']([^"'\s]{8,})["']/gi,
    capture: 2,
  },
];

/**
 * WARN rules. Things that are credentials but are knowingly published in this
 * repository, so blocking them would break the seed. Reported on every commit
 * so the exposure stays visible instead of quietly becoming normal.
 */
const WARN_RULES = [
  {
    name: 'seeded demo password',
    re: /\b(?:admin|manager|ops|sales|finance|supplier|user|demo)123\b/g,
  },
  {
    name: 'hardcoded bcrypt hash',
    re: /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g,
  },
];

/** Files that are expected to contain credential-shaped text. */
const ALLOWED_FILES = new Set(['backend/.env.example', 'backend/.env', '.env.example']);

// ---------------------------------------------------------------------------
// scanning
// ---------------------------------------------------------------------------

/** @type {{path: string, text: string}[]} */
let targets = [];
let mode = 'staged';

const argv = process.argv.slice(2);
if (argv.includes('--all')) mode = 'all';
const strict = argv.includes('--strict');

if (mode === 'staged') {
  const names = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  for (const path of names.split('\n').map((s) => s.trim()).filter(Boolean)) {
    // Resolve the staged blob by its index sha rather than reading the working
    // tree, so unstaged edits are invisible to the scan.
    const indexEntry = git(['ls-files', '-s', '--', path]).trim();
    const sha = indexEntry.split(/\s+/)[1];
    if (!sha) continue;
    let buf;
    try {
      buf = execFileSync(GIT, ['cat-file', 'blob', sha], { maxBuffer: 64 * 1024 * 1024 });
    } catch {
      continue;
    }
    // Skip binaries: a NUL in the first 8 KB is the conventional signal.
    if (buf.subarray(0, 8000).includes(0)) continue;
    targets.push({ path, text: buf.toString('utf8') });
  }
} else {
  const names = git(['ls-files']);
  for (const path of names.split('\n').map((s) => s.trim()).filter(Boolean)) {
    const abs = join(repoRoot, path);
    if (!existsSync(abs)) continue;
    const buf = execFileSync(GIT, ['show', `:${path}`], { maxBuffer: 64 * 1024 * 1024 });
    if (buf.subarray(0, 8000).includes(0)) continue;
    targets.push({ path, text: buf.toString('utf8') });
  }
}

if (targets.length === 0) {
  process.exit(0);
}

const findings = [];

for (const { path, text } of targets) {
  const allowed = ALLOWED_FILES.has(path);
  for (const rule of [...BLOCK_RULES, ...WARN_RULES]) {
    const isBlock = BLOCK_RULES.includes(rule);
    const re = new RegExp(rule.re.source, rule.re.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      const value = rule.capture ? m[rule.capture] : m[0];
      // Placeholder filtering applies to both tiers: a documented stand-in is
      // not a finding whether it sits in .env.example or anywhere else.
      if (isPlaceholder(value)) continue;
      // An allowed file only ever produces warnings.
      const tier = allowed ? 'warn' : isBlock ? 'block' : 'warn';
      const line = text.slice(0, m.index).split('\n').length;
      findings.push({ tier, path, line, name: rule.name, match: m[0].slice(0, 12) });
      if (m.index === re.lastIndex) re.lastIndex++; // guard against empty matches
    }
  }
}

const blocks = findings.filter((f) => f.tier === 'block');
const warns = findings.filter((f) => f.tier === 'warn');

if (warns.length) {
  console.log('');
  console.log('  scan-secrets: advisory findings (not blocking)');
  for (const w of warns) {
    console.log(`    ${w.path}:${w.line}  ${w.name}`);
  }
  console.log('');
}

if (blocks.length === 0) {
  if (strict && warns.length) {
    console.error('scan-secrets: --strict is set and advisory findings were found.');
    process.exit(1);
  }
  process.exit(0);
}

console.error('');
console.error('  scan-secrets: COMMIT BLOCKED - credential-shaped content detected');
for (const b of blocks) {
  console.error(`    ${b.path}:${b.line}  ${b.name}`);
}
console.error('');
console.error('  If any of these are false positives, add the file to ALLOWED_FILES in');
console.error('  scripts/scan-secrets.mjs with a comment saying why.');
console.error('  To inspect what would be committed:  git diff --cached');
console.error('');

// Keep the raw values out of the output; they are already in the transcript
// of whatever wrote them, and printing them spreads them further.
process.exit(1);
