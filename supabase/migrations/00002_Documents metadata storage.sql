create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    filename text not null,
    original_filename text not null,
    mime_type text not null,
    storage_bucket text not null,
    storage_path text not null,
    file_size_bytes bigint,
    sha256_hash text,
    upload_status text not null default 'uploaded',
    document_kind text,
    page_count integer,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);
