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
import { api, randomLogPayload, sleep } from "./lib.mjs";

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
  }

  const totalSystems = orgs.reduce((n, o) => n + o.systems.length, 0);
  console.log(`\nDone -- sent up to ${LOGS_PER_SYSTEM * totalSystems} logs across ${orgs.length} orgs / ${totalSystems} systems.`);
  console.log("Give Elasticsearch a second or two to finish indexing, then refresh the dashboard.");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
