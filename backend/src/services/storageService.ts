import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

/**
 * Supabase Storage wrapper for supplier invoice documents.
 *
 * The bucket is expected to be PRIVATE. Downloads are served through short-lived
 * signed URLs generated per request — never expose the service role key or a
 * permanent public URL to the browser.
 */

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'supplier-invoices';

let client: SupabaseClient | null = null;

const getClient = (): SupabaseClient => {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw createError(
      'File storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      500
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
};

export const isStorageConfigured = (): boolean =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Strip anything that could escape the intended directory or confuse a filesystem. */
const sanitizeSegment = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);

/**
 * Upload a supplier invoice file and return its storage path (not a URL).
 * Objects are namespaced per supplier so listings stay predictable.
 *
 * `mimeType` must be the caller-validated type. The bucket restricts
 * `allowed_mime_types`, and Storage rejects any upload whose content type is
 * not on that list — so a generic `application/octet-stream` would fail even
 * for a valid PDF.
 */
export const uploadInvoiceFile = async (
  buffer: Buffer,
  originalName: string,
  supplierId: string,
  invoiceId: string,
  mimeType?: string
): Promise<string> => {
  const safeName = sanitizeSegment(originalName || 'invoice');
  const path = `${sanitizeSegment(supplierId)}/${invoiceId}-${Date.now()}-${safeName}`;

  // Never forward a client-supplied type verbatim; fall back to a safe default
  // the bucket accepts so a missing argument fails loudly rather than silently
  // writing an untyped object.
  const contentType =
    mimeType && /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(mimeType)
      ? mimeType
      : 'application/octet-stream';

  const { error } = await getClient().storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    logger.error('[Storage] Upload failed:', error);
    // Surface the underlying reason in development only; the client gets a
    // generic message so provider internals are not exposed.
    const detail =
      process.env.NODE_ENV === 'development' ? `: ${error.message}` : '';
    throw createError(`Failed to store the invoice file${detail}`, 500);
  }

  logger.info(`[Storage] Uploaded ${path} (${buffer.length} bytes)`);
  return path;
};

/** Generate a time-limited signed URL for downloading a stored file. */
export const createSignedUrl = async (path: string, expiresInSeconds = 300): Promise<string> => {
  const { data, error } = await getClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    logger.error('[Storage] Signed URL generation failed:', error);
    const detail = process.env.NODE_ENV === 'development' && error ? `: ${error.message}` : '';
    throw createError(`Could not generate a download link for this file${detail}`, 500);
  }

  return data.signedUrl;
};

/** Permanently delete a stored file. Safe to call if the file is already gone. */
export const removeFile = async (path: string): Promise<void> => {
  const { error } = await getClient().storage.from(BUCKET).remove([path]);
  if (error) {
    // Non-fatal: the database row is the source of truth for the record.
    logger.warn(`[Storage] Could not remove ${path}: ${error.message}`);
  }
};
