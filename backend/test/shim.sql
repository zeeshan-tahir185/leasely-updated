-- shim.sql — simulates the Supabase-provided environment for LOCAL validation ONLY.
-- In a real Supabase instance the platform provides the auth schema, auth.uid(),
-- and the authenticated/anon/service_role roles. DO NOT run this against Supabase.

-- Roles PostgREST connects as.
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon')          then create role anon          nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role')  then create role service_role  nologin bypassrls; end if;
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'
);

-- auth.uid(): the logged-in user id, taken from the JWT claim GUC that PostgREST
-- sets per request. In tests we set it with set_config('request.jwt.claim.sub', …).
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage  on schema auth        to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
grant select on auth.users          to authenticated;
