-- LogMetric x Supabase: org presence audit table
--
-- Run this once in the Supabase project's SQL editor (Dashboard -> SQL
-- Editor -> New query). It is NOT applied automatically by anything in
-- this repo -- LogMetric's own Postgres (see application.properties,
-- SPRING_DATASOURCE_URL) is a completely separate database and never
-- touches this file.
--
-- The join/leave records here are a best-effort audit log written by
-- logmetric-ui/app/supabase/usePresence.ts. The live "who's online now"
-- indicator itself does NOT depend on this table -- it runs entirely over
-- a Supabase Realtime Presence channel. This table exists so the RLS
-- portion of the syllabus has something concrete to point at.

create table if not exists presence_events (
  id bigint generated always as identity primary key,
  organization_id bigint not null,
  email text not null,
  event text not null check (event in ('join', 'leave')),
  created_at timestamptz not null default now()
);

create index if not exists presence_events_org_idx on presence_events (organization_id, created_at desc);

alter table presence_events enable row level security;

-- Honest limitation, called out in REPORT.md: LogMetric uses its own JWT
-- auth, not Supabase Auth, so there is no auth.uid()/auth.jwt() identity
-- for Postgres to check -- the anon key has no per-user claims to filter
-- on. A production version would mint a custom Supabase JWT (or a
-- Postgres function fed a signed org claim) so this policy could check
-- organization_id against the caller's own token instead of trusting the
-- client-supplied value. That's out of scope for the 2-hour session; this
-- policy still demonstrates RLS syntax and blocks anonymous access from
-- outside Supabase's client libraries (no anon SELECT/INSERT grant means
-- the REST API 404s without it).
create policy "presence_events_insert" on presence_events
  for insert
  to anon
  with check (true);

create policy "presence_events_select" on presence_events
  for select
  to anon
  using (true);
