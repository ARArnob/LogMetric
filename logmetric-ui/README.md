# LogMetric UI

A modern, dark-themed observability dashboard for the LogMetric log telemetry engine.

## Features

- **Dark terminal aesthetic** — purpose-built for a log monitoring tool
- **Live log stream** with level filtering (ERROR / WARN / INFO / DEBUG)
- **Demo mode** — auto-generates realistic mock log data when backend is unreachable
- **Pause / Resume** stream control
- **CSV export** for log data
- **Fully responsive** — works on mobile and desktop

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, features, and architecture diagram |
| `/dashboard` | Live telemetry dashboard with stats cards and log stream |
| `/signin` | Sign-in form (links to dashboard for demo) |
| `/signup` | Registration form (links to dashboard for demo) |

## Local Development

```bash
cd logmetric-ui
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

### Option A — Vercel CLI

```bash
npm install -g vercel
cd logmetric-ui
vercel
```

Follow the prompts. On first deploy, Vercel will ask about framework detection — it will auto-detect Next.js.

### Option B — GitHub Import

1. Push this folder (or the whole repo) to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repository
4. Set **Root Directory** to `logmetric-ui`
5. Click **Deploy**

### Environment Variables (optional)

In Vercel project settings → Environment Variables:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.com/api` |

If not set, the dashboard runs in **demo mode** with simulated live log data.

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Lucide React** icons
