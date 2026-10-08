-- Cover the private delivery and input-lock foreign keys without changing authority.
begin;

create index delivery_receipts_principal_job_idx
  on mew_private.delivery_receipts (principal, provider, job_id);

create index input_locks_principal_operation_idx
  on mew_private.input_locks (principal, operation_id);

commit;
