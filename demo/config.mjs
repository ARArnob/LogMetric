// Shared config for setup-demo-data.mjs and send-demo-logs.mjs.
// BACKEND_URL assumes the application.properties default. Change it if
// you're running the backend on a different host/port for your demo.

export const BACKEND_URL = process.env.LOGMETRIC_BACKEND_URL ?? "http://localhost:8081";

// The Gmail account your backend sends real mail FROM (same one as
// spring.mail.username / SPRING_MAIL_USERNAME) -- required, not defaulted,
// since demo emails need somewhere real to land. setup-demo-data.mjs sends
// each org's verification email to `user+alias@gmail.com`, which Gmail
// delivers straight back into this same inbox, and reads it back out via
// IMAP using the same app password your backend already uses for SMTP.
export const GMAIL_USER = process.env.LOGMETRIC_GMAIL_USER ?? "ararnob1002@gmail.com";
export const GMAIL_APP_PASSWORD = process.env.LOGMETRIC_GMAIL_APP_PASSWORD ?? "ptkdprgsbfgeprqd";

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  throw new Error(
    "Set LOGMETRIC_GMAIL_USER and LOGMETRIC_GMAIL_APP_PASSWORD (the same Gmail address/app " +
      "password your backend uses for SPRING_MAIL_USERNAME/SPRING_MAIL_PASSWORD) before running " +
      "the demo scripts."
  );
}

/** `user+aurora-retail-8klvn@gmail.com` -- Gmail routes this back to GMAIL_USER's own inbox. */
export function aliasEmail(tag) {
  const [local, domain] = GMAIL_USER.split("@");
  return `${local}+${tag}@${domain}`;
}

// Same password for every seeded admin -- one thing to remember during a live
// demo, not one per org. Meets the app's policy (>=8 chars, upper+lower+digit).
export const DEMO_PASSWORD = "DemoPass123";

// Each org gets a fresh, randomized name suffix at setup time (see
// setup-demo-data.mjs) so re-running the script never collides with an
// existing org name. These are just the "front half" of each name.
export const ORG_DEFS = [
  {
    name: "Aurora Retail",
    systems: [
      { name: "Checkout API", services: ["checkout-api", "payment-gateway", "cart-service"] },
      { name: "Inventory Service", services: ["inventory-service", "warehouse-sync"] },
      { name: "Storefront Web", services: ["storefront-web", "search-service", "cdn-edge"] },
    ],
  },
  {
    name: "Nimbus Health",
    systems: [
      { name: "Patient Portal", services: ["patient-portal", "auth-service"] },
      { name: "Billing Service", services: ["billing-service", "insurance-gateway"] },
      { name: "Appointment Scheduler", services: ["scheduler-service", "notification-service"] },
    ],
  },
  {
    name: "Vertex Robotics",
    systems: [
      { name: "Fleet Controller", services: ["fleet-controller", "route-planner"] },
      { name: "Telemetry Ingest", services: ["telemetry-ingest", "sensor-gateway"] },
      { name: "Firmware Updater", services: ["firmware-updater", "device-registry"] },
    ],
  },
];

// [level, weight, templates]. Weights don't need to sum to anything in
// particular -- they're relative. {token} placeholders are filled in by
// fillTemplate() in lib.mjs. Repeating the same template with different
// numbers/ids is deliberate -- it's what PatternRecognitionService clusters
// together in the Pattern Clusters page.
export const LEVEL_TEMPLATES = {
  INFO: {
    weight: 60,
    templates: [
      "Request completed in {ms}ms",
      "User {uid} logged in successfully",
      "Cache hit for key {key}",
      "Processed batch of {n} items",
      "Health check passed",
      "Scheduled job {job} completed successfully",
    ],
  },
  WARN: {
    weight: 20,
    templates: [
      "Response time {ms}ms exceeded threshold of 500ms",
      "Retrying request to {service} (attempt {n}/3)",
      "Deprecated endpoint /v1/{resource} called",
      "Connection pool at {pct}% capacity",
      "Rate limit threshold {pct}% reached for {service}",
    ],
  },
  ERROR: {
    weight: 15,
    templates: [
      "Failed to connect to database after {n} attempts",
      "Unhandled exception in {method}: NullPointerException",
      "Payment processing failed for order {oid}",
      "Upstream timeout after {ms}ms calling {service}",
      "Failed to acquire lock on resource {resource} after {n} retries",
    ],
  },
  DEBUG: {
    weight: 5,
    templates: [
      "Cache miss for key {key}, fetching from source",
      "Entering method {method} with {n} args",
      "Query executed in {ms}ms: SELECT * FROM {table}",
    ],
  },
};

// Heartbeat pattern (PLAN-PATTERN-INTELLIGENCE.md P4 demo note): fires on a
// steady cadence long enough to establish one (AlertEvaluationService requires
// 10+ occurrences), then deliberately stops partway through the seeded
// window -- so PATTERN_SILENCE has something real to alert on right after
// seeding, instead of the presenter having to wait for a pattern to go quiet
// live.
export const HEARTBEAT_TEMPLATE = "Heartbeat check from {service} succeeded";
export const HEARTBEAT_COUNT = 40;
export const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between beats
export const HEARTBEAT_SILENT_SINCE_MS = 2 * 24 * 60 * 60 * 1000; // last beat 2 days before "now"

// Post-deploy error templates (P2 + P3 demo): never emitted anywhere else in
// this generator, so their first occurrence is guaranteed to be brand new --
// and each is timestamped just a few minutes after the seeded deployment
// below, so GET /api/deployments/{id}/new-patterns and a NEW_PATTERN alert
// both have a genuine causal story ("new template right after this deploy")
// instead of a random coincidence.
export const POST_DEPLOY_ERROR_TEMPLATES = [
  "Unhandled exception in checkoutV2Handler: TypeError: cannot read property 'total' of undefined",
  "Feature flag 'new-tax-engine' returned malformed response for order {oid}",
  "Migration guard blocked write: schema version mismatch on {table}",
];

export const DEPLOYMENT_VERSION = "v2.1.0";
export const DEPLOYMENT_NOTES = "Rolled out the new checkout tax engine";
export const DEPLOYMENT_DAYS_AGO = 3; // fixed point inside the 14-day seeded window
