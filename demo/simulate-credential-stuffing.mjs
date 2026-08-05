// Live-traffic simulation for the PARAM_CARDINALITY demo (P6, "parameter
// intelligence" -- the academic contribution).
//
// Why this can't just be seeded like the other stories: ParameterStatsService
// buckets distinct-value counts into 5-minute windows keyed by wall-clock
// time at ingestion (see PatternParamWindow.windowStart/windowEnd), not by
// the log's own `timestamp` field. Backdating a log's timestamp (like
// send-demo-logs.mjs does for everything else) has no effect on which
// real-time window its parameters land in. AlertEvaluationService also
// requires 6 prior windows of history before it will compare anything --
// deliberately, so it doesn't fire on a cold start. There is no way to fake
// 30+ minutes of history except by producing 30+ minutes of real traffic.
//
// The story: "User {uid} logged in successfully" is a template that already
// exists from send-demo-logs.mjs, normally seeing a small, stable set of
// distinct users. This script sends the SAME message/rate throughout --
// only the uid pool changes -- so total volume stays flat while distinct
// count spikes. That flat-volume-but-cardinality-spikes shape is the entire
// point of the feature: a volume or error-rate alert would stay silent.
//
// Usage (start this at least ~35-40 minutes before you want to show the
// alert firing -- see demo/README.md):
//   node demo/simulate-credential-stuffing.mjs [orgIndex] [systemIndex]
//
// Tuning:
//   LOGMETRIC_BASELINE_MINUTES=30 LOGMETRIC_SPIKE_MINUTES=15 node demo/simulate-credential-stuffing.mjs

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { api, randomInt, sleep } from "./lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "demo-data.json");

const ORG_INDEX = Number(process.argv[2] ?? 0);
const SYSTEM_INDEX = Number(process.argv[3] ?? 0);

const BASELINE_MINUTES = Number(process.env.LOGMETRIC_BASELINE_MINUTES ?? 30); // 6 x 5-min windows
const SPIKE_MINUTES = Number(process.env.LOGMETRIC_SPIKE_MINUTES ?? 10);
const RATE_PER_MINUTE = Number(process.env.LOGMETRIC_RATE_PER_MINUTE ?? 20);
// ~200 distinct users/hour scaled down to a 5-min window, per the credential-
// stuffing example in FUTURE_ENHANCEMENTS.md / PLAN-PATTERN-INTELLIGENCE.md.
const BASELINE_UID_POOL = Number(process.env.LOGMETRIC_BASELINE_POOL ?? 17);

const INTERVAL_MS = 60_000 / RATE_PER_MINUTE;
const TEMPLATE = "User {uid} logged in successfully";

function baselineUid() {
  return randomInt(1000, 1000 + BASELINE_UID_POOL - 1);
}

function spikeUid() {
  // Effectively unique every call -- a credential-stuffing attempt never
  // reuses the same account twice in a row.
  return `${Date.now()}${randomInt(0, 999)}`;
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8").catch(() => {
    throw new Error(`Couldn't read ${DATA_PATH} -- run "node demo/setup-demo-data.mjs" first.`);
  });
  const { orgs } = JSON.parse(raw);
  const org = orgs[ORG_INDEX];
  if (!org) throw new Error(`No org at index ${ORG_INDEX} in ${DATA_PATH} (have ${orgs.length}).`);
  const system = org.systems[SYSTEM_INDEX];
  if (!system) throw new Error(`No system at index ${SYSTEM_INDEX} in org "${org.orgName}".`);

  const totalMinutes = BASELINE_MINUTES + SPIKE_MINUTES;
  console.log(`Simulating credential stuffing against ${org.orgName} / ${system.name} (${system.services[0]}).`);
  console.log(`Baseline: ${BASELINE_MINUTES} min, ~${BASELINE_UID_POOL} distinct users, ${RATE_PER_MINUTE}/min.`);
  console.log(`Then spike: ${SPIKE_MINUTES} min, unique user per request, same ${RATE_PER_MINUTE}/min rate.`);
  console.log(`Total runtime ~${totalMinutes} min. Create a PARAM_CARDINALITY alert rule now if you haven't --`);
  console.log(`it needs 6 prior 5-min windows before it will compare anything, so nothing will fire before`);
  console.log(`roughly the ${BASELINE_MINUTES}-minute mark. Ctrl+C to stop early.\n`);

  const startedAt = Date.now();
  let sent = 0;
  let spikeAnnounced = false;

  while (true) {
    const elapsedMin = (Date.now() - startedAt) / 60_000;
    if (elapsedMin >= totalMinutes) break;

    const inSpike = elapsedMin >= BASELINE_MINUTES;
    if (inSpike && !spikeAnnounced) {
      spikeAnnounced = true;
      console.log(`\n[${new Date().toLocaleTimeString()}] Baseline done -- switching to unique users per request now.\n`);
    }

    const uid = inSpike ? spikeUid() : baselineUid();
    const message = TEMPLATE.replace("{uid}", uid);
    const body = { level: "INFO", serviceName: system.services[0], message };

    api("/api/logs", { method: "POST", apiKey: system.apiKey, body }).catch((err) => {
      console.error(`  send failed: ${err.message}`);
    });

    sent += 1;
    if (sent % (RATE_PER_MINUTE * 5) === 0) {
      // Roughly once per flush window, so progress output lines up with when
      // a new PatternParamWindow row should have landed.
      console.log(`[${new Date().toLocaleTimeString()}] ~${elapsedMin.toFixed(1)} min elapsed, ${sent} sent, phase=${inSpike ? "SPIKE" : "baseline"}`);
    }

    await sleep(INTERVAL_MS);
  }

  console.log(`\nDone -- sent ${sent} logs over ~${totalMinutes} minutes.`);
  console.log(`Check the Alerts live feed / your PARAM_CARDINALITY rule's email now.`);
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
