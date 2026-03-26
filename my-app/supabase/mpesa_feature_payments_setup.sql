create extension if not exists "pgcrypto";

create table if not exists public.mpesa_feature_payments (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  phone text,
  amount integer not null,
  status text not null default 'pending',
  merchant_request_id text,
  checkout_request_id text unique,
  response_code text,
  response_description text,
  customer_message text,
  result_code integer,
  result_desc text,
  receipt_number text,
  featured_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_mpesa_feature_payments_house_id
  on public.mpesa_feature_payments(house_id, created_at desc);

create or replace function public.set_mpesa_feature_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_mpesa_feature_payments_updated_at on public.mpesa_feature_payments;

create trigger trg_mpesa_feature_payments_updated_at
before update on public.mpesa_feature_payments
for each row
execute function public.set_mpesa_feature_payments_updated_at();

alter table public.mpesa_feature_payments enable row level security;

drop policy if exists "Users can view payment logs for their houses" on public.mpesa_feature_payments;
create policy "Users can view payment logs for their houses"
on public.mpesa_feature_payments
for select
to authenticated
using (
  exists (
    select 1
    from public.houses
    where houses.id = mpesa_feature_payments.house_id
      and houses.user_id = auth.uid()
  )
);
