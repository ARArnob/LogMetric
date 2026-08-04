import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { BACKEND_URL, GMAIL_USER, GMAIL_APP_PASSWORD, LEVEL_TEMPLATES } from "./config.mjs";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Thin fetch wrapper: throws with the response body on a non-2xx so failures are loud, not silent. */
export async function api(path, { method = "GET", token, apiKey, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (apiKey) headers["X-API-KEY"] = apiKey;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  // POST /api/logs returns a plain-text body ("202 Accepted..."), not JSON --
  // every other endpoint here returns JSON (or an empty 204 body).
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Logs into Gmail via IMAP (same account/app password the backend uses for
 * SMTP) and polls for the most recent message addressed to `email` --
 * a `user+alias@gmail.com` address that Gmail delivers straight back into
 * this same inbox. Pulls the 6-digit OTP out of the plain-text body, same
 * regex FakeMailConfig uses in the test suite.
 *
 * Real mail delivery (even self-to-self) isn't instant like MailHog was --
 * default timeout is generous. If it consistently times out, check the Spam
 * folder: an account that suddenly starts sending itself several
 * verification-code-shaped emails in a row can get flagged.
 */
export async function waitForOtpCode(email, { timeoutMs = 60_000, intervalMs = 3_000 } = {}) {
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    logger: false,
  });

  try {
    await client.connect();
  } catch (err) {
    throw new Error(
      `Gmail IMAP login failed for ${GMAIL_USER}: ${err.responseText ?? err.message}. ` +
        `Check LOGMETRIC_GMAIL_USER/LOGMETRIC_GMAIL_APP_PASSWORD are correct (must be an app ` +
        `password, not your regular Gmail password), and that IMAP is enabled: Gmail settings -> ` +
        `See all settings -> Forwarding and POP/IMAP -> Enable IMAP.`
    );
  }
  try {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const uids = await client.search({ to: email }, { uid: true });
        if (uids && uids.length > 0) {
          const latestUid = uids[uids.length - 1];
          const message = await client.fetchOne(latestUid, { source: true }, { uid: true });
          if (message?.source) {
            const parsed = await simpleParser(message.source);
            const match = /\d{6}/.exec(parsed.text ?? "");
            if (match) return match[0];
          }
        }
      } finally {
        lock.release();
      }
      await sleep(intervalMs);
    }
    throw new Error(
      `Timed out waiting for an OTP email to ${email} via Gmail IMAP. Check that ` +
        `LOGMETRIC_GMAIL_USER/LOGMETRIC_GMAIL_APP_PASSWORD are correct, that the backend's ` +
        `spring.mail.* is actually configured to send through this same account, and check Spam.`
    );
  } finally {
    await client.logout();
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fillTemplate(template) {
  return template
    .replace("{ms}", randomInt(20, 4000))
    .replace("{uid}", randomInt(1000, 9999))
    .replace("{key}", `session:${randomInt(10000, 99999)}`)
    .replace("{n}", randomInt(1, 12))
    .replace("{job}", ["cleanup", "digest-email", "cache-warm", "reindex"][randomInt(0, 3)])
    .replace("{resource}", ["users", "orders", "invoices", "devices"][randomInt(0, 3)])
    .replace("{pct}", randomInt(60, 99))
    .replace("{oid}", `ord_${randomInt(100000, 999999)}`)
    .replace("{method}", ["processPayment", "syncInventory", "fetchProfile", "renderPage"][randomInt(0, 3)])
    .replace("{table}", ["users", "orders", "sessions", "audit_logs"][randomInt(0, 3)])
    // {service} is filled in by the caller, which knows the sibling services
    // for this system -- left as-is here if the caller doesn't replace it.
    ;
}

const LEVELS = Object.keys(LEVEL_TEMPLATES);
const TOTAL_WEIGHT = LEVELS.reduce((sum, l) => sum + LEVEL_TEMPLATES[l].weight, 0);

function pickLevel() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const level of LEVELS) {
    r -= LEVEL_TEMPLATES[level].weight;
    if (r <= 0) return level;
  }
  return LEVELS[LEVELS.length - 1];
}

/** Builds one randomized log payload for a system with the given candidate serviceNames. */
export function randomLogPayload(services, { minMsAgo = 0, maxMsAgo = 0 } = {}) {
  const level = pickLevel();
  const templates = LEVEL_TEMPLATES[level].templates;
  const template = templates[randomInt(0, templates.length - 1)];
  const service = services[randomInt(0, services.length - 1)];
  const otherService = services[randomInt(0, services.length - 1)];

  const message = fillTemplate(template).replace("{service}", otherService);
  const ago = randomInt(minMsAgo, maxMsAgo);
  const timestamp = new Date(Date.now() - ago).toISOString();

  return { level, serviceName: service, message, timestamp };
}
