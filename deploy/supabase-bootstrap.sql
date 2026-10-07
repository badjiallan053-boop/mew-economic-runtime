-- Reviewed bootstrap artifact, applied once to the selected MEW project.
-- No browser grants, security-definer functions, extensions or existing-table changes.
begin;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'mew_backend') then
    create role mew_backend nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
  if exists (select 1 from pg_roles where rolname = 'mew_backend' and
    (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolcanlogin)) then
    raise exception 'Existing mew_backend role exceeds reviewed permissions';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'mew_runtime') then
    create role mew_runtime nologin nosuperuser nocreatedb nocreaterole inherit nobypassrls;
  end if;
  if exists (select 1 from pg_roles where rolname = 'mew_runtime' and
    (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb)) then
    raise exception 'Existing mew_runtime role exceeds reviewed permissions';
  end if;
end $$;
grant mew_backend to mew_runtime;
create schema mew_private;
revoke all on schema mew_private from public;
grant usage on schema mew_private to mew_backend;

create table mew_private.ledgers (
  principal text primary key check (length(principal) between 1 and 200),
  policy_digest text not null check (policy_digest ~ '^[a-f0-9]{64}$'),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 2097152),
  revision bigint not null default 0 check (revision >= 0)
);
create table mew_private.escrow_operations (
  principal text not null references mew_private.ledgers(principal),
  id text not null check (length(id) between 1 and 200),
  effect_id text not null,
  tx_hash text not null unique check (tx_hash ~ '^[a-f0-9]{64}$'),
  contract_digest text not null check (contract_digest ~ '^[a-f0-9]{64}$'),
  record jsonb not null check (jsonb_typeof(record) = 'object' and octet_length(record::text) <= 262144),
  primary key (principal,id), unique (principal,effect_id)
);
create table mew_private.input_locks (
  reference text primary key check (reference ~ '^[a-f0-9]{64}#[0-9]+$'),
  principal text not null,
  operation_id text not null,
  foreign key (principal,operation_id) references mew_private.escrow_operations(principal,id)
);
create table mew_private.model_runs (
  principal text not null references mew_private.ledgers(principal),
  id text not null check (length(id) between 1 and 200),
  contract jsonb not null check (octet_length(contract::text) <= 32768),
  status text not null check (status in ('RUNNING','COMPLETE','UNKNOWN')),
  fence text not null check (fence ~ '^[a-f0-9-]{36}$'),
  result jsonb check (result is null or octet_length(result::text) <= 65536),
  primary key (principal,id)
);

alter table mew_private.ledgers enable row level security;
alter table mew_private.ledgers force row level security;
alter table mew_private.escrow_operations enable row level security;
alter table mew_private.escrow_operations force row level security;
alter table mew_private.input_locks enable row level security;
alter table mew_private.input_locks force row level security;
alter table mew_private.model_runs enable row level security;
alter table mew_private.model_runs force row level security;

create policy principal_boundary on mew_private.ledgers to mew_backend
using (principal = current_setting('mew.principal',true))
with check (principal = current_setting('mew.principal',true));
create policy principal_boundary on mew_private.escrow_operations to mew_backend
using (principal = current_setting('mew.principal',true))
with check (principal = current_setting('mew.principal',true));
create policy principal_boundary on mew_private.input_locks to mew_backend
using (principal = current_setting('mew.principal',true))
with check (principal = current_setting('mew.principal',true));
create policy principal_boundary on mew_private.model_runs to mew_backend
using (principal = current_setting('mew.principal',true))
with check (principal = current_setting('mew.principal',true));

revoke all on all tables in schema mew_private from public;
grant select,insert,update on mew_private.ledgers,mew_private.escrow_operations,mew_private.model_runs to mew_backend;
grant select,insert on mew_private.input_locks to mew_backend;
alter default privileges in schema mew_private revoke all on tables from public;
commit;
