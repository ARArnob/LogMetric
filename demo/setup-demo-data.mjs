// Creates a fresh set of demo organizations, each with several named systems
// and one API key per system, against your backend. Writes demo-data.json
// for send-demo-logs.mjs to pick up.
//
// Prerequisites: the backend running, with spring.mail.* actually configured
// to send through the same Gmail account as LOGMETRIC_GMAIL_USER below.
//
// Usage:
//   LOGMETRIC_GMAIL_USER=you@gmail.com LOGMETRIC_GMAIL_APP_PASSWORD=xxxx node demo/setup-demo-data.mjs
//
// Safe to re-run -- each run creates brand-new orgs with a random suffix
// rather than colliding with a previous run's org names. Re-running does NOT
// clean up prior runs' orgs; see demo/README.md if you want a clean slate.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ORG_DEFS, DEMO_PASSWORD, aliasEmail, DEPLOYMENT_VERSION, DEPLOYMENT_NOTES, DEPLOYMENT_DAYS_AGO } from "./config.mjs";
import { api, waitForOtpCode } from "./lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "demo-data.json");

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function setupOrg(orgDef) {
  const suffix = Math.random().toString(36).slice(2, 7);
  const orgName = `${orgDef.name} ${suffix}`;
  const slug = slugify(orgDef.name);
  // Unique tag per run (via suffix) so this never collides with a stale
  // verification email still sitting in the inbox from an earlier run.
  const adminEmail = aliasEmail(`${slug}-${suffix}`);

  console.log(`\n== ${orgName} ==`);
  console.log(`Registering admin ${adminEmail} ...`);
  await api("/api/auth/register", {
    method: "POST",
    body: { email: adminEmail, password: DEMO_PASSWORD, organizationName: orgName },
  });

  console.log("Waiting for verification email via Gmail IMAP (can take up to a minute)...");
  const code = await waitForOtpCode(adminEmail);

  console.log("Verifying email ...");
  const { token } = await api("/api/auth/verify-email", {
    method: "POST",
    body: { email: adminEmail, code },
  });

  // Registration auto-creates one "Default System" -- delete it once the
  // real named systems exist below, so the demo org doesn't have a stray
  // empty system nobody ever sends logs to.
  const existingSystems = await api("/api/systems", { token });
  const defaultSystem = existingSystems.find((s) => s.name === "Default System");

  const systems = [];
  for (const sysDef of orgDef.systems) {
    console.log(`Creating system "${sysDef.name}" ...`);
    const system = await api("/api/systems", { method: "POST", token, body: { name: sysDef.name } });

    console.log(`  Generating API key ...`);
    const { apiKey } = await api(`/api/systems/${system.id}/keys`, { method: "POST", token });

    systems.push({ id: system.id, name: sysDef.name, services: sysDef.services, apiKey });
  }

  if (defaultSystem) {
    console.log(`Removing the auto-created "Default System" ...`);
    await api(`/api/systems/${defaultSystem.id}`, { method: "DELETE", token });
  }

  // Org-wide deploy marker (no systemId) at a fixed point inside the 14-day
  // window send-demo-logs.mjs seeds -- gives P3's histogram marker and P2's
  // "new pattern since this deploy" story something real to point at, instead
  // of requiring a manual POST /api/deployments before every demo.
  console.log(`Recording a deployment marker (${DEPLOYMENT_VERSION}) ...`);
  const deployedAt = Date.now() - DEPLOYMENT_DAYS_AGO * 24 * 60 * 60 * 1000;
  const deployment = await api("/api/deployments", {
    method: "POST",
    token,
    body: { version: DEPLOYMENT_VERSION, notes: DEPLOYMENT_NOTES, deployedAt },
  });

  return {
    orgName,
    adminEmail,
    adminPassword: DEMO_PASSWORD,
    systems,
    deployment: { id: deployment.id, version: deployment.version, deployedAt: deployment.deployedAt },
  };
}

async function main() {
  const orgs = [];
  for (const orgDef of ORG_DEFS) {
    orgs.push(await setupOrg(orgDef));
  }

  await writeFile(OUTPUT_PATH, JSON.stringify({ createdAt: new Date().toISOString(), orgs }, null, 2));

  console.log("\n\n=== Demo orgs ready ===");
  console.log(`(All admins share the password: ${DEMO_PASSWORD})\n`);
  for (const org of orgs) {
    console.log(`${org.orgName}`);
    console.log(`  Login: ${org.adminEmail}`);
    for (const sys of org.systems) {
      console.log(`  System "${sys.name}" (id ${sys.id}): ${sys.services.join(", ")}`);
    }
    console.log(`  Deployment marker: ${org.deployment.version} at ${new Date(org.deployment.deployedAt).toLocaleString()}`);
    console.log("");
  }
  console.log(`Saved to ${OUTPUT_PATH} -- run "node demo/send-demo-logs.mjs" next to populate them with logs.`);
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
