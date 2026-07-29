import { randomUUID } from "node:crypto";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const MIN_FORM_AGE_MS = 1_500;
const MAX_FORM_AGE_MS = 2 * 60 * 60 * 1_000;
const RATE_WINDOW_MS = 10 * 60 * 1_000;
const RATE_MAX_REQUESTS = 5;
const rateBuckets = new Map();

function sendJson(response, status, payload) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  return response.status(status).json(payload);
}

function parseBody(request) {
  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  if (Buffer.isBuffer(request.body)) {
    return JSON.parse(request.body.toString("utf8"));
  }

  return request.body ?? {};
}

function cleanText(value, maxLength, multiline = false) {
  if (typeof value !== "string" || value.length > maxLength * 2) return "";

  const controlCharacters = multiline
    ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
    : /[\u0000-\u001F\u007F]/g;

  return value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(controlCharacters, "")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character],
  );
}

function requestIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") return forwardedFor.split(",")[0].trim();
  return request.socket?.remoteAddress || "unknown";
}

function exceedsRateLimit(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_MAX_REQUESTS;
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  if (!origin || !host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function sendEmail(apiKey, payload, idempotencyKey) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("Resend rejected the email");
    error.providerStatus = response.status;
    error.providerCode = body?.name || body?.message || "unknown";
    throw error;
  }

  return body;
}

function notificationEmail({ from, to, name, email, problem }) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeProblem = escapeHtml(problem).replace(/\n/g, "<br />");

  return {
    from,
    to: [to],
    reply_to: email,
    subject: `Nuevo encargo — ${name.replace(/[\r\n]/g, " ")}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#24282f">
        <p style="font-size:12px;letter-spacing:.14em;color:#859f56">ENCARGO / WEB</p>
        <h1 style="font-size:32px;line-height:1.05">Un nuevo problema está sobre la mesa.</h1>
        <p><strong>Nombre</strong><br />${safeName}</p>
        <p><strong>Email</strong><br /><a href="mailto:${safeEmail}">${safeEmail}</a></p>
        <p><strong>El problema</strong><br />${safeProblem}</p>
      </div>
    `,
    text: `Nuevo encargo desde donkeyindustrial.com\n\nNombre: ${name}\nEmail: ${email}\n\nEl problema:\n${problem}`,
    tags: [{ name: "source", value: "contact-form" }],
  };
}

function confirmationEmail({ from, to, name, replyTo }) {
  const safeName = escapeHtml(name);

  return {
    from,
    to: [to],
    reply_to: replyTo,
    subject: "Tu encargo ya está sobre la mesa",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#24282f">
        <p style="font-size:12px;letter-spacing:.14em;color:#859f56">DONKEY INDUSTRIAL</p>
        <h1 style="font-size:32px;line-height:1.05">Gracias, ${safeName}.</h1>
        <p>Hemos recibido el contexto de tu proyecto. Lo revisaremos y te responderemos desde este mismo correo.</p>
        <p style="color:#626865">Este mensaje confirma la recepción; no es una respuesta automática de venta.</p>
      </div>
    `,
    text: `Gracias, ${name}.\n\nHemos recibido el contexto de tu proyecto. Lo revisaremos y te responderemos desde este mismo correo.`,
    tags: [{ name: "source", value: "contact-confirmation" }],
  };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, {
      ok: false,
      message: "Método no permitido.",
    });
  }

  if (!sameOrigin(request)) {
    return sendJson(response, 403, {
      ok: false,
      message: "No se ha podido validar el origen de la petición.",
    });
  }

  if (exceedsRateLimit(requestIp(request))) {
    return sendJson(response, 429, {
      ok: false,
      message: "Demasiados intentos. Espera unos minutos o escríbenos por email.",
    });
  }

  let body;
  try {
    body = parseBody(request);
  } catch {
    return sendJson(response, 400, {
      ok: false,
      message: "La petición no tiene un formato válido.",
    });
  }

  const honeypot = cleanText(body.company, 120);
  if (honeypot) {
    return sendJson(response, 200, { ok: true, confirmationSent: false });
  }

  const startedAt = Number(body.startedAt);
  const formAge = Date.now() - startedAt;
  if (
    !Number.isFinite(startedAt) ||
    formAge < MIN_FORM_AGE_MS ||
    formAge > MAX_FORM_AGE_MS
  ) {
    return sendJson(response, 400, {
      ok: false,
      message: "No hemos podido validar el formulario. Recarga la página e inténtalo de nuevo.",
    });
  }

  const name = cleanText(body.name, 80);
  const email = cleanText(body.email, 254).toLowerCase();
  const problem = cleanText(body.problem, 4_000, true);

  if (name.length < 2) {
    return sendJson(response, 400, {
      ok: false,
      field: "name",
      message: "Indica tu nombre.",
    });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return sendJson(response, 400, {
      ok: false,
      field: "email",
      message: "Indica un email válido.",
    });
  }

  if (problem.length < 20) {
    return sendJson(response, 400, {
      ok: false,
      field: "problem",
      message: "Cuéntanos un poco más sobre el problema.",
    });
  }

  const apiKey =
    process.env.RESEND_API_KEY || process.env.resend_RESEND_API_KEY;
  const contactTo = process.env.CONTACT_TO || "hola@donkeyindustrial.com";
  const contactFrom =
    process.env.CONTACT_FROM || "DONKEY Industrial <onboarding@resend.dev>";

  if (!apiKey) {
    console.error("[api/contact] Resend API key is not configured");
    return sendJson(response, 503, {
      ok: false,
      message: "El canal todavía no está configurado. Escríbenos directamente por email.",
    });
  }

  const requestId = REQUEST_ID_PATTERN.test(body.requestId)
    ? body.requestId
    : randomUUID();

  try {
    const notification = await sendEmail(
      apiKey,
      notificationEmail({
        from: contactFrom,
        to: contactTo,
        name,
        email,
        problem,
      }),
      `contact/${requestId}/notification`,
    );

    let confirmationSent = false;
    if (process.env.CONTACT_CONFIRMATION_ENABLED === "true") {
      try {
        await sendEmail(
          apiKey,
          confirmationEmail({
            from: contactFrom,
            to: email,
            name,
            replyTo: contactTo,
          }),
          `contact/${requestId}/confirmation`,
        );
        confirmationSent = true;
      } catch (error) {
        console.warn("[api/contact] confirmation email failed", {
          providerStatus: error.providerStatus,
          providerCode: error.providerCode,
        });
      }
    }

    return sendJson(response, 200, {
      ok: true,
      id: notification.id,
      confirmationSent,
    });
  } catch (error) {
    console.error("[api/contact] notification email failed", {
      providerStatus: error.providerStatus,
      providerCode: error.providerCode,
    });

    return sendJson(response, 502, {
      ok: false,
      message: "No hemos podido enviar el mensaje. Inténtalo de nuevo o escríbenos por email.",
    });
  }
}
