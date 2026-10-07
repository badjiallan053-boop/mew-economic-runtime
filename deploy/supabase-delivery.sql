-- Optional reviewed delivery extension. Apply with migration owner after bootstrap.
-- No actual provider enrollment, dispatch, financial settlement or release.
begin;
create table mew_private.delivery_contracts (
 principal text not null references mew_private.ledgers(principal),
 effect_id text not null check (length(effect_id) between 1 and 200),
 provider text not null check (length(provider) between 1 and 200),
 job_id text not null check (length(job_id) between 1 and 200),
 contract jsonb not null check (jsonb_typeof(contract)='object' and octet_length(contract::text)<=8192),
 primary key(principal,effect_id), unique(provider,job_id), unique(principal,provider,job_id)
);
create table mew_private.delivery_receipts (
 principal text not null references mew_private.ledgers(principal),
 provider text not null check (length(provider) between 1 and 200),
 key_id text not null check (length(key_id) between 1 and 200),
 receipt_id text not null check (length(receipt_id) between 1 and 200),
 job_id text not null check (length(job_id) between 1 and 200),
 record jsonb not null check (jsonb_typeof(record)='object' and octet_length(record::text)<=8192),
 primary key(provider,key_id,receipt_id), unique(provider,job_id),
 foreign key(principal,provider,job_id) references mew_private.delivery_contracts(principal,provider,job_id)
);
alter table mew_private.delivery_contracts enable row level security;
alter table mew_private.delivery_contracts force row level security;
alter table mew_private.delivery_receipts enable row level security;
alter table mew_private.delivery_receipts force row level security;
create policy principal_boundary on mew_private.delivery_contracts to mew_backend
using(principal=current_setting('mew.principal',true)) with check(principal=current_setting('mew.principal',true));
create policy principal_boundary on mew_private.delivery_receipts to mew_backend
using(principal=current_setting('mew.principal',true)) with check(principal=current_setting('mew.principal',true));
revoke all on mew_private.delivery_contracts,mew_private.delivery_receipts from public;
grant select,insert on mew_private.delivery_contracts,mew_private.delivery_receipts to mew_backend;
commit;
