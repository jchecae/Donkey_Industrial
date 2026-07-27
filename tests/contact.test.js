import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import handler from "../api/contact.js";

const originalFetch = globalThis.fetch;
const originalEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  CONTACT_TO: process.env.CONTACT_TO,
  CONTACT_FROM: process.env.CONTACT_FROM,
  CONTACT_CONFIRMATION_ENABLED: process.env.CONTACT_CONFIRMATION_ENABLED,
};
let requestSequence = 10;

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    payload: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

function validRequest(overrides = {}) {
  return {
    method: "POST",
    headers: {
      host: "donkeyindustrial.com",
      origin: "https://donkeyindustrial.com",
      "x-forwarded-for": `198.51.100.${requestSequence++}`,
    },
    body: {
      name: "Ana Torres",
      email: "ana@example.com",
      problem:
        "Necesitamos validar el montaje y las tolerancias antes de fabricar la primera serie.",
      company: "",
      startedAt: Date.now() - 5_000,
      requestId: "contact-test-123456",
      ...overrides,
    },
  };
}

test("rejects methods other than POST", async () => {
  const response = createResponse();
  await handler({ method: "GET", headers: {} }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "POST");
});

test("accepts honeypot submissions without sending email", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("fetch should not be called");
  };

  const response = createResponse();
  await handler(validRequest({ company: "Spam Company" }), response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.ok, true);
  assert.equal(called, false);
});

test("requires a realistically completed form", async () => {
  const response = createResponse();
  await handler(validRequest({ startedAt: Date.now() }), response);

  assert.equal(response.statusCode, 400);
  assert.match(response.payload.message, /validar el formulario/i);
});

test("returns a clear error when Resend is not configured", async () => {
  delete process.env.RESEND_API_KEY;

  const response = createResponse();
  await handler(validRequest(), response);

  assert.equal(response.statusCode, 503);
  assert.match(response.payload.message, /no está configurado/i);
});

test("sends a validated notification with reply-to and idempotency", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.CONTACT_TO = "hola@donkeyindustrial.com";
  process.env.CONTACT_FROM = "DONKEY Industrial <proyectos@donkeyindustrial.com>";
  process.env.CONTACT_CONFIRMATION_ENABLED = "false";

  let capturedRequest;
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return new Response(JSON.stringify({ id: "email_123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const response = createResponse();
  await handler(validRequest(), response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.id, "email_123");
  assert.equal(capturedRequest.url, "https://api.resend.com/emails");
  assert.equal(
    capturedRequest.options.headers["Idempotency-Key"],
    "contact/contact-test-123456/notification",
  );

  const email = JSON.parse(capturedRequest.options.body);
  assert.deepEqual(email.to, ["hola@donkeyindustrial.com"]);
  assert.equal(email.reply_to, "ana@example.com");
  assert.match(email.text, /validar el montaje/);
});

test("can send the optional visitor confirmation after the notification", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.CONTACT_TO = "hola@donkeyindustrial.com";
  process.env.CONTACT_FROM = "DONKEY Industrial <proyectos@donkeyindustrial.com>";
  process.env.CONTACT_CONFIRMATION_ENABLED = "true";

  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ id: `email_${requests.length}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const response = createResponse();
  await handler(validRequest(), response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.confirmationSent, true);
  assert.equal(requests.length, 2);

  const confirmation = JSON.parse(requests[1].options.body);
  assert.deepEqual(confirmation.to, ["ana@example.com"]);
  assert.equal(confirmation.reply_to, "hola@donkeyindustrial.com");
  assert.equal(
    requests[1].options.headers["Idempotency-Key"],
    "contact/contact-test-123456/confirmation",
  );
});
