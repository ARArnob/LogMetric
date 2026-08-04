# Demo data generator

Populates the app with realistic-looking data for a live demo: 3 organizations,
3 named systems each, and a stream of varied logs (spread over the last 14
days, weighted toward INFO/WARN with a smaller share of ERROR/DEBUG) so the
dashboard, Pattern Clusters, Topology, and Log Explorer pages all have
something real to show instead of one lonely test event.

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

## Tuning

```bash
# More/less log volume, spread over a different window
LOGMETRIC_LOGS_PER_SYSTEM=300 LOGMETRIC_DAYS_BACK=30 node demo/send-demo-logs.mjs

# Point at a backend running somewhere other than localhost:8081
LOGMETRIC_BACKEND_URL=http://your-public-address:8081 node demo/send-demo-logs.mjs
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
