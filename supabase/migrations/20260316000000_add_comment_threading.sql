-- Add parent_id for single-level threaded comments
alter table comments add column parent_id uuid references comments(id) on delete cascade;

-- Partial index for looking up replies by parent
create index idx_comments_parent_id on comments(parent_id) where parent_id is not null;
