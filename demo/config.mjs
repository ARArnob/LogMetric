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
export const GMAIL_USER = process.env.LOGMETRIC_GMAIL_USER;
export const GMAIL_APP_PASSWORD = process.env.LOGMETRIC_GMAIL_APP_PASSWORD;

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
