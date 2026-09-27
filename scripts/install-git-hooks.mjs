#!/usr/bin/env node
/**
 * Install the repository's git hooks.
 *
 * Points `core.hooksPath` at the tracked `.githooks/` directory. Hooks are kept
 * in the repository rather than `.git/hooks/` so they are version controlled
 * and a fresh clone can enable them with one command:
 *
 *     node scripts/install-git-hooks.mjs
 *
 * Install it as your local post-merge hook and it will re-enable itself for
 * anyone who clones, without anyone having to remember.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

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
      /* next */
    }
  }
  console.error('install-git-hooks: could not find git on PATH.');
  process.exit(2);
}

const GIT = resolveGit();
const git = (args) => execFileSync(GIT, args, { encoding: 'utf8' }).trim();

/** `git config --get` exits 1 when the key is absent, which is not an error. */
function gitConfigGet(key) {
  try {
    return execFileSync(GIT, ['config', '--get', key], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const repoRoot = git(['rev-parse', '--show-toplevel']);
const hooksPath = '.githooks';
const hooksDir = join(repoRoot, hooksPath);

if (!existsSync(hooksDir)) {
  console.error(`install-git-hooks: ${hooksPath}/ not found. Is this a fresh clone?`);
  process.exit(1);
}

for (const hook of ['pre-commit', 'post-commit']) {
  if (!existsSync(join(hooksDir, hook))) {
    console.error(`install-git-hooks: missing ${hooksPath}/${hook}`);
    process.exit(1);
  }
}

const previous = gitConfigGet('core.hooksPath') || '(unset)';
git(['config', 'core.hooksPath', hooksPath]);

console.log(`  core.hooksPath: ${previous} -> ${hooksPath}`);
console.log('');
console.log('  Active hooks:');
console.log('    pre-commit    blocks commits containing credentials');
console.log('    post-commit   pushes to origin after every commit');
console.log('');
console.log('  Opt outs:');
console.log('    KIC_SKIP_SECRET_SCAN=1 git commit -m "..."   skip the scan once');
console.log('    KIC_NO_PUSH=1 git commit -m "..."             skip auto-push once');
