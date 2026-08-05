// Sends a realistic spread of logs to every system created by
// setup-demo-data.mjs -- varied services, severities (weighted toward INFO),
// and message templates with randomized numbers/ids so the Pattern Clusters
// page has real clusters to show, spread across the last N days so the
// ingest volume histogram shows real history instead of a single spike.
//
// Usage: node demo/send-demo-logs.mjs
// Override defaults:  LOGMETRIC_LOGS_PER_SYSTEM=300 LOGMETRIC_DAYS_BACK=30 node demo/send-demo-logs.mjs
//
// Safe to re-run -- each run just adds more logs on top of what's there.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { api, randomLogPayload, fillTemplate, sleep } from "./lib.mjs";
import {
  HEARTBEAT_TEMPLATE,
  HEARTBEAT_COUNT,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_SILENT_SINCE_MS,
  POST_DEPLOY_ERROR_TEMPLATES,
} from "./config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "demo-data.json");

const LOGS_PER_SYSTEM = Number(process.env.LOGMETRIC_LOGS_PER_SYSTEM ?? 150);
const DAYS_BACK = Number(process.env.LOGMETRIC_DAYS_BACK ?? 14);
const CONCURRENCY = Number(process.env.LOGMETRIC_CONCURRENCY ?? 20);

async function sendBatch(apiKey, payloads) {
  const results = await Promise.allSettled(
    payloads.map((body) => api("/api/logs", { method: "POST", apiKey, body }))
  );
  return results.filter((r) => r.status === "rejected").length;
}

async function sendForSystem(org, system) {
  const maxMsAgo = DAYS_BACK * 24 * 60 * 60 * 1000;
  const payloads = Array.from({ length: LOGS_PER_SYSTEM }, () =>
    randomLogPayload(system.services, { minMsAgo: 0, maxMsAgo })
  );

  let failures = 0;
  for (let i = 0; i < payloads.length; i += CONCURRENCY) {
    const batch = payloads.slice(i, i + CONCURRENCY);
    failures += await sendBatch(system.apiKey, batch);
    process.stdout.write(`\r  ${org.orgName} / ${system.name}: ${Math.min(i + CONCURRENCY, payloads.length)}/${payloads.length}`);
    // Small pacing gap so this reads as a stream to LogConsumer, not one giant burst.
    await sleep(50);
  }
  console.log(failures > 0 ? ` (${failures} failed)` : " done");
}

/**
 * Seeds one pattern per org with a real, established cadence that then goes
 * quiet -- PATTERN_SILENCE (P4) needs occurrenceCount >= 10 and a lastSeen
 * far enough in the past to clear threshold * avgInterval, and this
 * guarantees both rather than leaving it to chance among the random logs.
 */
async function sendHeartbeatPattern(org, system) {
  const service = system.services[0];
  const message = HEARTBEAT_TEMPLATE.replace("{service}", service);

  const payloads = Array.from({ length: HEARTBEAT_COUNT }, (_, i) => {
    // i=0 is the oldest beat; the last beat (i = COUNT-1) sits
    // HEARTBEAT_SILENT_SINCE_MS in the past, so the pattern has a real
    // cadence and then goes silent, rather than being one lonely old log.
    const ago = HEARTBEAT_SILENT_SINCE_MS + (HEARTBEAT_COUNT - 1 - i) * HEARTBEAT_INTERVAL_MS;
    return { level: "INFO", serviceName: service, message, timestamp: new Date(Date.now() - ago).toISOString() };
  });

  const failures = await sendBatch(system.apiKey, payloads);
  const silentDays = (HEARTBEAT_SILENT_SINCE_MS / 86_400_000).toFixed(1);
  console.log(`  ${org.orgName} / ${system.name}: heartbeat pattern seeded, last beat ${silentDays}d ago${failures ? ` (${failures} failed)` : ""}`);
}

/**
 * Seeds a few templates that have never been sent anywhere else in this
 * generator, timestamped just after the org's deployment marker -- so P2
 * (new pattern) and P3 (deploy-caused-it causality) have a real story:
 * "this error didn't exist before the deploy, and started right after it."
 */
async function sendPostDeployErrors(org, system) {
  if (!org.deployment) return;

  const payloads = POST_DEPLOY_ERROR_TEMPLATES.map((template, i) => {
    const message = fillTemplate(template).replace("{service}", system.services[0]);
    const ts = org.deployment.deployedAt + (i + 1) * 4 * 60 * 1000;
    return { level: "ERROR", serviceName: system.services[0], message, timestamp: new Date(ts).toISOString() };
  });

  const failures = await sendBatch(system.apiKey, payloads);
  console.log(`  ${org.orgName} / ${system.name}: post-deploy error patterns seeded${failures ? ` (${failures} failed)` : ""}`);
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8").catch(() => {
    throw new Error(`Couldn't read ${DATA_PATH} -- run "node demo/setup-demo-data.mjs" first.`);
  });
  const { orgs } = JSON.parse(raw);

  console.log(`Sending ~${LOGS_PER_SYSTEM} logs per system, spread across the last ${DAYS_BACK} days...\n`);

  for (const org of orgs) {
    for (const system of org.systems) {
      await sendForSystem(org, system);
    }
    // Story seeds: once per org, on its first system only -- one system's
    // view tells the whole P2/P3/P4 story without every system in the org
    // showing the identical heartbeat/incident.
    const primary = org.systems[0];
    if (primary) {
      await sendHeartbeatPattern(org, primary);
      await sendPostDeployErrors(org, primary);
    }
  }

  const totalSystems = orgs.reduce((n, o) => n + o.systems.length, 0);
  console.log(`\nDone -- sent up to ${LOGS_PER_SYSTEM * totalSystems} logs across ${orgs.length} orgs / ${totalSystems} systems.`);
  console.log("Give Elasticsearch a second or two to finish indexing, then refresh the dashboard.");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
