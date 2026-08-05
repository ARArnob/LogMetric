# Demo data generator

Populates the app with realistic-looking data for a live demo: 3 organizations,
3 named systems each, and a stream of varied logs (spread over the last 14
days, weighted toward INFO/WARN with a smaller share of ERROR/DEBUG) so the
dashboard, Pattern Clusters, Topology, and Log Explorer pages all have
something real to show instead of one lonely test event.

It also seeds three specific stories for the pattern-intelligence features in
`PLAN-PATTERN-INTELLIGENCE.md` (P2-P4), so those don't depend on live timing
or luck during the actual demo -- see "What gets seeded" below. P6 (parameter
cardinality) can't be seeded this way and needs its own script; see its own
section below.

## Prerequisites

- The backend running, with `spring.mail.*` actually configured to send real
  mail through a Gmail account (the same one you'll point these scripts at).
- `npm install` inside `demo/` once, to pull in `imapflow`/`mailparser`
  (used to read verification codes back out of Gmail — see below).
- Node.js (already required for the frontend).

```bash
cd demo
npm install
```

### Getting the verification code without checking your inbox by hand

`setup-demo-data.mjs` sends each org's admin signup to
`your-account+something@gmail.com`. Gmail delivers `+alias` addresses straight
back into the base account's own inbox, so the script logs into that same
account over IMAP (using the same app password your backend already uses for
SMTP) and reads the code back out automatically — no manual "check your
email" step.

You need an **app password** for this (a regular Gmail password won't work
for IMAP): Google Account → Security → 2-Step Verification → App passwords.
Set both of these before running `setup-demo-data.mjs`:

```bash
export LOGMETRIC_GMAIL_USER=youraccount@gmail.com
export LOGMETRIC_GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx   # 16-char app password, no spaces
```

`send-demo-logs.mjs` doesn't touch email at all, so it doesn't need these.

Real mail delivery isn't instant like a local mail catcher would be — the
script polls for up to a minute per org. If it consistently times out, check
Spam: an account sending itself several verification-code-shaped emails in a
row can occasionally get flagged.

## Usage

```bash
# 1. Create the orgs, systems, and API keys (prints admin logins + writes demo-data.json)
node demo/setup-demo-data.mjs

# 2. Send the actual log volume
node demo/send-demo-logs.mjs
```

Re-running step 2 just adds more logs on top of what's there — safe to run
again if you want more volume. Re-running step 1 creates a **new** set of
orgs each time (randomized name suffix, so it never collides) rather than
reusing the previous run's — if you don't want the old ones lying around
before a demo, wipe the dev database first:

```bash
docker compose down -v && docker compose up -d
```

## What gets seeded (P2/P3/P4)

Alongside the random log spread, step 2 also seeds one deliberate story per
org, on that org's first system, so these three demos don't depend on live
timing or luck:

- **A deployment marker** (P3) — created by step 1, org-wide, 3 days before
  "now" (`version: "v2.1.0"`). Shows up as a vertical line on the dashboard's
  ingest volume histogram once you pick a time range that includes it.
- **Post-deploy error templates** (P2 + P3) — three ERROR-level messages
  never sent anywhere else in this generator, timestamped a few minutes after
  that deployment. They're guaranteed to be "new patterns" the first time
  anyone queries them, and `GET /api/deployments/{id}/new-patterns` will
  return exactly these three — the causal "this error started right after we
  shipped" story, without needing to send a live message during the demo.
- **A heartbeat pattern that goes silent** (P4) — `"Heartbeat check from
  <service> succeeded"`, sent 40 times on a steady 5-minute cadence, with the
  last beat 2 days before "now". That's enough occurrences to establish a
  cadence (`AlertEvaluationService` requires 10+) and long enough silence to
  clear any reasonable `PATTERN_SILENCE` threshold immediately after seeding.

To actually see any of these fire as alerts, create the corresponding
`AlertRule` (metric `NEW_PATTERN`, `PATTERN_SILENCE`) from the Alerts page
first — the scheduler evaluates on its normal 60s tick, no waiting required
since these are already backdated into the past.

## P6 — parameter cardinality (needs a separate, real-time script)

`send-demo-logs.mjs` backdates every log's `timestamp` field, which works for
P2-P4 because those all key off `first_seen`/`last_seen` on the pattern
registry — but P6 does not. `ParameterStatsService` buckets distinct-value
counts into 5-minute windows keyed by **wall-clock time at ingestion**, and
`AlertEvaluationService` requires 6 completed prior windows (30 real minutes)
before it will compare anything, by design (see that task's note in
`PLAN-PATTERN-INTELLIGENCE.md` — it's deliberately not a cold-start feature).
There is no way to fake that history; it has to be produced in real time.

```bash
# Start this ~35-40 minutes before you want to show the alert firing.
node demo/simulate-credential-stuffing.mjs        # org 0, system 0 by default
node demo/simulate-credential-stuffing.mjs 1 0    # a different org/system
```

It sends the same `"User {uid} logged in successfully"` template (already
familiar to the pattern registry from step 2) at a constant rate throughout —
only the pool of user ids changes, from a small reused set to a unique id per
request — so total volume stays flat while distinct-value count spikes. That
flat-volume/cardinality-spikes shape is the whole point of the feature; a
volume or error-rate alert would stay silent through the entire run. Create
the `PARAM_CARDINALITY` alert rule before or during the baseline phase — it
won't have anything to compare against until the ~30-minute mark regardless
of when the rule was created.

Don't run this at the same time as `send-demo-logs.mjs` against the same
org/system — interleaved traffic on the same template pollutes the windows
this script is trying to shape.

## Tuning

```bash
# More/less log volume, spread over a different window
LOGMETRIC_LOGS_PER_SYSTEM=300 LOGMETRIC_DAYS_BACK=30 node demo/send-demo-logs.mjs

# Point at a backend running somewhere other than localhost:8081
LOGMETRIC_BACKEND_URL=http://your-public-address:8081 node demo/send-demo-logs.mjs

# Shorter/longer credential-stuffing simulation (minutes), different rate/pool
LOGMETRIC_BASELINE_MINUTES=20 LOGMETRIC_SPIKE_MINUTES=8 node demo/simulate-credential-stuffing.mjs
```

Org/system names and message templates live in `demo/config.mjs` if you want
to change the story (e.g. different company names, different log content).

## Output

`demo/demo-data.json` holds every generated org's admin email/password and
each system's raw API key — it's gitignored, since API keys aren't meant to
be recoverable after generation anywhere else in the app either, and it's the
one file `send-demo-logs.mjs` needs if you want to run it from a different
machine than the one that ran setup (see the main README/chat history for
why `setup-demo-data.mjs` itself is tied to wherever your Gmail IMAP access
works from).
