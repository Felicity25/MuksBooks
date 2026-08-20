-- Add page-aware metadata to cloud document chunks for exact Tutor page retrieval.
alter table public.document_chunks
  add column if not exists page_start integer,
  add column if not exists page_end integer;

create index if not exists idx_document_chunks_doc_page
  on public.document_chunks (document_id, page_start, page_end);

create index if not exists idx_document_chunks_user_course_page
  on public.document_chunks (user_id, course_code, page_start, page_end);
