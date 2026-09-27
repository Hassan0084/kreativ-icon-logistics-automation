-- Kreativ Icon Logistics — Supabase project setup
--
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is guarded.
--
-- Creates the private storage bucket used for supplier invoice files.
-- The bucket is PRIVATE on purpose. The backend generates short-lived signed
-- URLs per download via the service role key, so files are never publicly
-- reachable by guessing a path.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-invoices',
  'supplier-invoices',
  false,
  10485760, -- 10 MB
  array[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- RLS is left enabled on storage.objects. All access from the application goes
-- through the service role key, which bypasses RLS, so no storage policies are
-- created here on purpose. Do not add a public policy for this bucket.
