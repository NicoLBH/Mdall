create unique index if not exists idx_documents_sha256_hash_unique
on public.documents(sha256_hash)
where sha256_hash is not null;
