import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
/* eslint import-x/no-unresolved: "off" */
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { Pool } from "pg";

const PORT = Number(process.env.PORT || 8090);
const DATABASE_URL = process.env.DATABASE_URL;
const EVOLUTION_URL = (
  process.env.EVOLUTION_URL || "http://127.0.0.1:8080"
).replace(/\/$/, "");
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = "vigilateh";
const dealStages = ["lead", "contactado", "cotización", "ganado", "perdido"];
const ticketStatuses = ["open", "in_progress", "closed"];
const ticketPriorities = ["low", "normal", "high", "urgent"];
const invoiceStatuses = ["pending", "paid", "overdue", "cancelled"];
const TRACCAR_URL = (
  process.env.TRACCAR_URL || "http://127.0.0.1:8082"
).replace(/\/$/, "");
const dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new Pool({ connectionString: DATABASE_URL });
const app = express();
const authCache = new Map();
const cacheTtl = 60_000;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

if (process.env.CORS_ORIGIN) {
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true,
    }),
  );
}

const sendError = (res, status, message) =>
  res.status(status).json({ error: message });

const authenticate = async (req, res, next) => {
  try {
    const sessionId = req.cookies.JSESSIONID;
    if (!sessionId) return sendError(res, 401, "Authentication required");

    const now = Date.now();
    const cached = authCache.get(sessionId);
    if (cached?.expires > now) {
      req.traccarUser = cached.user;
    } else {
      authCache.delete(sessionId);
      const response = await fetch(`${TRACCAR_URL}/api/session`, {
        headers: { Cookie: `JSESSIONID=${encodeURIComponent(sessionId)}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return sendError(res, 401, "Invalid session");

      const user = await response.json();
      if (!Number.isInteger(Number(user.id))) {
        return sendError(res, 401, "Invalid session");
      }
      req.traccarUser = user;
      authCache.set(sessionId, { user, expires: now + cacheTtl });
    }

    if (
      !req.traccarUser.administrator &&
      req.traccarUser.attributes?.role !== "MANAGER"
    ) {
      return sendError(res, 403, "CRM access denied");
    }

    req.traccarCookie = `JSESSIONID=${encodeURIComponent(sessionId)}`;
    next();
  } catch (error) {
    next(error);
  }
};

const findOwnedClient = async (clientId, ownerId) => {
  const result = await pool.query(
    "SELECT id FROM tc_crm_clients WHERE id = $1 AND owner_id = $2",
    [clientId, ownerId],
  );
  return result.rowCount > 0;
};

const parseId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const optionalText = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || null;
};

const extractMessages = (payload) => {
  const candidates = [
    payload,
    payload?.messages,
    payload?.data,
    payload?.data?.messages,
    payload?.messages?.records,
    payload?.data?.messages?.records,
  ];
  return candidates.find(Array.isArray) || [];
};

const messageBody = (message) => {
  const content = message.message || {};
  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    content.buttonsResponseMessage?.selectedDisplayText ||
    content.templateButtonReplyMessage?.selectedDisplayText ||
    null
  );
};

const messageDate = (message) => {
  const raw =
    message.messageTimestamp || message.timestamp || message.createdAt;
  if (raw === undefined || raw === null) return null;
  const numeric = Number(raw);
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

const validDateTime = (value) =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

const validateDealField = (field, value) => {
  if (field === "title") return optionalText(value) || undefined;
  if (field === "amount") {
    if (value === null || value === "") return null;
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
  }
  if (field === "currency") {
    const currency = optionalText(value)?.toUpperCase();
    return currency && /^[A-Z]{3}$/.test(currency) ? currency : undefined;
  }
  if (field === "stage") return dealStages.includes(value) ? value : undefined;
  if (field === "expected_close") {
    if (value === null || value === "") return null;
    return validDate(value) ? value : undefined;
  }
  return undefined;
};

app.get("/api/crm/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/crm", authenticate);

app.get("/api/crm/traccar-users", async (_req, res) => {
  const result = await pool.query(
    "SELECT id, name, email FROM tc_users ORDER BY name, id",
  );
  res.json(result.rows);
});

app.put("/api/crm/clients/:id/traccar-user", async (req, res) => {
  const clientId = parseId(req.params.id);
  const userId = req.body?.userId === null ? null : parseId(req.body?.userId);
  if (!clientId || (req.body?.userId !== null && !userId))
    return sendError(res, 400, "Invalid client or user id");
  if (userId) {
    const user = await pool.query("SELECT 1 FROM tc_users WHERE id = $1", [
      userId,
    ]);
    if (!user.rowCount) return sendError(res, 404, "Traccar user not found");
  }
  const result = await pool.query(
    `UPDATE tc_crm_clients SET traccar_user_id = $3, updated_at = NOW()
     WHERE id = $1 AND owner_id = $2
     RETURNING id`,
    [clientId, req.traccarUser.id, userId],
  );
  if (!result.rowCount) return sendError(res, 404, "Client not found");
  res.json({ success: true });
});

app.get("/api/crm/clients", async (req, res) => {
  const result = await pool.query(
    `SELECT c.id, c.name, c.phone, c.email, c.notes, c.created_at, c.updated_at,
      (jsonb_agg(DISTINCT jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email)) FILTER (WHERE u.id IS NOT NULL))->0 AS "traccarUser",
      COALESCE(
        json_agg(json_build_object('id', d.id, 'name', d.name, 'uniqueId', d.uniqueid)
          ORDER BY d.name) FILTER (WHERE d.id IS NOT NULL),
        '[]'::json
      ) AS devices
     FROM tc_crm_clients c
     LEFT JOIN tc_crm_client_devices cd ON cd.client_id = c.id
     LEFT JOIN tc_devices d ON d.id = cd.device_id
     LEFT JOIN tc_users u ON u.id = c.traccar_user_id
     WHERE c.owner_id = $1
     GROUP BY c.id
     ORDER BY c.name`,
    [req.traccarUser.id],
  );
  res.json(result.rows);
});

app.post("/api/crm/clients", async (req, res) => {
  const name = optionalText(req.body?.name);
  if (!name) return sendError(res, 400, "Client name is required");
  const phone = optionalText(req.body.phone);
  const email = optionalText(req.body.email);
  const notes = optionalText(req.body.notes);
  if ([phone, email, notes].includes(undefined)) {
    return sendError(res, 400, "Invalid client fields");
  }

  const result = await pool.query(
    `INSERT INTO tc_crm_clients (owner_id, name, phone, email, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, phone, email, notes, created_at, updated_at`,
    [req.traccarUser.id, name, phone, email, notes],
  );
  res.status(201).json({ ...result.rows[0], devices: [] });
});

app.get("/api/crm/clients/:id", async (req, res) => {
  const clientId = parseId(req.params.id);
  if (!clientId) return sendError(res, 400, "Invalid client id");
  const result = await pool.query(
    `SELECT c.id, c.name, c.phone, c.email, c.notes, c.created_at, c.updated_at,
      (jsonb_agg(DISTINCT jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email)) FILTER (WHERE u.id IS NOT NULL))->0 AS "traccarUser",
      COALESCE(
        json_agg(json_build_object('id', d.id, 'name', d.name, 'uniqueId', d.uniqueid)
          ORDER BY d.name) FILTER (WHERE d.id IS NOT NULL),
        '[]'::json
      ) AS devices
     FROM tc_crm_clients c
     LEFT JOIN tc_crm_client_devices cd ON cd.client_id = c.id
     LEFT JOIN tc_devices d ON d.id = cd.device_id
     LEFT JOIN tc_users u ON u.id = c.traccar_user_id
     WHERE c.id = $1 AND c.owner_id = $2
     GROUP BY c.id`,
    [clientId, req.traccarUser.id],
  );
  if (!result.rowCount) return sendError(res, 404, "Client not found");
  res.json({
    ...result.rows[0],
    stats: { devices: result.rows[0].devices.length },
  });
});

app.get("/api/crm/clients/:id/messages", async (req, res) => {
  const clientId = parseId(req.params.id);
  if (!clientId) return sendError(res, 400, "Invalid client id");
  const limit = Math.min(Math.max(parseId(req.query.limit) || 50, 1), 100);
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
  const owned = await findOwnedClient(clientId, req.traccarUser.id);
  if (!owned) return sendError(res, 404, "Client not found");

  const [messages, count] = await Promise.all([
    pool.query(
      `SELECT id, direction, body, wa_message_id, device_id, created_at
       FROM tc_crm_messages WHERE client_id = $1
       ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
      [clientId, limit, offset],
    ),
    pool.query(
      "SELECT COUNT(*)::int AS total FROM tc_crm_messages WHERE client_id = $1",
      [clientId],
    ),
  ]);
  res.json({
    items: messages.rows,
    total: count.rows[0].total,
    limit,
    offset,
  });
});

app.post("/api/crm/clients/:id/messages/sync", async (req, res) => {
  const clientId = parseId(req.params.id);
  if (!clientId) return sendError(res, 400, "Invalid client id");
  if (!EVOLUTION_API_KEY) {
    return sendError(res, 503, "Evolution API is not configured");
  }

  const clientResult = await pool.query(
    "SELECT phone FROM tc_crm_clients WHERE id = $1 AND owner_id = $2",
    [clientId, req.traccarUser.id],
  );
  if (!clientResult.rowCount) return sendError(res, 404, "Client not found");
  const digits = (clientResult.rows[0].phone || "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return sendError(res, 400, "Client phone is not in WhatsApp format");
  }

  const evolutionResponse = await fetch(
    `${EVOLUTION_URL}/chat/findMessages/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
    {
      method: "POST",
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        where: { key: { remoteJid: `${digits}@s.whatsapp.net` } },
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!evolutionResponse.ok) {
    return sendError(
      res,
      502,
      `Evolution API returned ${evolutionResponse.status}`,
    );
  }

  const payload = await evolutionResponse.json();
  const messages = extractMessages(payload);
  let inserted = 0;
  for (const message of messages) {
    const messageId = message.key?.id || message.id;
    if (!messageId) continue;
    const result = await pool.query(
      `INSERT INTO tc_crm_messages
        (client_id, direction, body, wa_message_id, device_id, created_at)
       VALUES ($1, $2, $3, $4, NULL, COALESCE($5::timestamptz, NOW()))
       ON CONFLICT (wa_message_id) DO NOTHING`,
      [
        clientId,
        message.key?.fromMe ? "out" : "in",
        messageBody(message),
        String(messageId),
        messageDate(message),
      ],
    );
    inserted += result.rowCount;
  }
  res.json({ inserted, fetched: messages.length });
});

app.put("/api/crm/clients/:id", async (req, res) => {
  const clientId = parseId(req.params.id);
  if (!clientId) return sendError(res, 400, "Invalid client id");

  const fields = ["name", "phone", "email", "notes"];
  const assignments = [];
  const values = [clientId, req.traccarUser.id];
  for (const field of fields) {
    if (!Object.hasOwn(req.body || {}, field)) continue;
    const value = optionalText(req.body[field]);
    if (value === undefined || (field === "name" && !value)) {
      return sendError(res, 400, "Invalid client fields");
    }
    values.push(value);
    assignments.push(`${field} = $${values.length}`);
  }
  if (!assignments.length) return sendError(res, 400, "No fields to update");
  assignments.push("updated_at = NOW()");

  const result = await pool.query(
    `UPDATE tc_crm_clients SET ${assignments.join(", ")}
     WHERE id = $1 AND owner_id = $2
     RETURNING id, name, phone, email, notes, created_at, updated_at`,
    values,
  );
  if (!result.rowCount) return sendError(res, 404, "Client not found");
  res.json(result.rows[0]);
});

app.delete("/api/crm/clients/:id", async (req, res) => {
  const clientId = parseId(req.params.id);
  if (!clientId) return sendError(res, 400, "Invalid client id");
  const result = await pool.query(
    "DELETE FROM tc_crm_clients WHERE id = $1 AND owner_id = $2 RETURNING id",
    [clientId, req.traccarUser.id],
  );
  if (!result.rowCount) return sendError(res, 404, "Client not found");
  res.status(204).end();
});

app.post("/api/crm/clients/:id/devices", async (req, res) => {
  const clientId = parseId(req.params.id);
  const deviceId = parseId(req.body?.deviceId);
  if (!clientId || !deviceId) return sendError(res, 400, "Invalid id");
  if (!(await findOwnedClient(clientId, req.traccarUser.id))) {
    return sendError(res, 404, "Client not found");
  }

  const deviceResponse = await fetch(`${TRACCAR_URL}/api/devices/${deviceId}`, {
    headers: { Cookie: req.traccarCookie },
    signal: AbortSignal.timeout(5000),
  });
  if (!deviceResponse.ok) {
    return sendError(
      res,
      deviceResponse.status === 404 ? 404 : 403,
      "Device unavailable",
    );
  }

  const result = await pool.query(
    `INSERT INTO tc_crm_client_devices (client_id, device_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING client_id, device_id`,
    [clientId, deviceId],
  );
  if (!result.rowCount) return sendError(res, 409, "Device already linked");
  res.status(201).json(result.rows[0]);
});

app.delete("/api/crm/clients/:id/devices/:deviceId", async (req, res) => {
  const clientId = parseId(req.params.id);
  const deviceId = parseId(req.params.deviceId);
  if (!clientId || !deviceId) return sendError(res, 400, "Invalid id");
  const result = await pool.query(
    `DELETE FROM tc_crm_client_devices cd
     USING tc_crm_clients c
     WHERE cd.client_id = c.id AND c.id = $1 AND c.owner_id = $2
       AND cd.device_id = $3
     RETURNING cd.device_id`,
    [clientId, req.traccarUser.id, deviceId],
  );
  if (!result.rowCount)
    return sendError(res, 404, "Client device link not found");
  res.status(204).end();
});

app.post("/api/crm/clients/:id/messages", async (req, res) => {
  const clientId = parseId(req.params.id);
  const body = optionalText(req.body?.body);
  if (!clientId) return sendError(res, 400, "Invalid client id");
  if (!body || body.length > 4096) {
    return sendError(res, 400, "Message must contain 1–4096 characters");
  }
  if (!EVOLUTION_API_KEY) {
    return sendError(res, 503, "Evolution API is not configured");
  }

  const clientResult = await pool.query(
    "SELECT id, phone FROM tc_crm_clients WHERE id = $1 AND owner_id = $2",
    [clientId, req.traccarUser.id],
  );
  if (!clientResult.rowCount) return sendError(res, 404, "Client not found");
  const digits = (clientResult.rows[0].phone || "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return sendError(res, 400, "Client phone is not in WhatsApp format");
  }

  const evolutionResponse = await fetch(
    `${EVOLUTION_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
    {
      method: "POST",
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ number: digits, text: body }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!evolutionResponse.ok) {
    return sendError(
      res,
      502,
      `Evolution API returned ${evolutionResponse.status}`,
    );
  }
  const sentMessage = await evolutionResponse.json();
  const messageId = sentMessage.key?.id || sentMessage.data?.key?.id || null;
  const createdAt = messageDate(sentMessage);
  const saved = await pool.query(
    `INSERT INTO tc_crm_messages
      (client_id, direction, body, wa_message_id, created_at)
     VALUES ($1, 'out', $2, $3, COALESCE($4::timestamptz, NOW()))
     ON CONFLICT (wa_message_id) DO NOTHING
     RETURNING id, direction, body, wa_message_id, created_at`,
    [clientId, body, messageId, createdAt],
  );
  res.status(201).json({
    sent: true,
    message: saved.rows[0] || {
      direction: "out",
      body,
      wa_message_id: messageId,
    },
  });
});

app.get("/api/crm/deals/board", async (req, res) => {
  const result = await pool.query(
    `SELECT d.id, d.client_id, c.name AS client_name, d.title, d.amount,
      d.currency, d.stage, d.expected_close, d.created_at, d.updated_at
     FROM tc_crm_deals d
     JOIN tc_crm_clients c ON c.id = d.client_id
     WHERE c.owner_id = $1
     ORDER BY d.updated_at DESC, d.id DESC`,
    [req.traccarUser.id],
  );
  const board = Object.fromEntries(dealStages.map((stage) => [stage, []]));
  for (const deal of result.rows) {
    (board[deal.stage] ||= []).push(deal);
  }
  res.json(board);
});

app.get("/api/crm/deals", async (req, res) => {
  const clientId = req.query.clientId ? parseId(req.query.clientId) : null;
  if (req.query.clientId && !clientId)
    return sendError(res, 400, "Invalid client id");
  const result = await pool.query(
    `SELECT d.id, d.client_id, c.name AS client_name, d.title, d.amount,
      d.currency, d.stage, d.expected_close, d.created_at, d.updated_at
     FROM tc_crm_deals d
     JOIN tc_crm_clients c ON c.id = d.client_id
     WHERE c.owner_id = $1 AND ($2::int IS NULL OR d.client_id = $2)
     ORDER BY d.updated_at DESC, d.id DESC`,
    [req.traccarUser.id, clientId],
  );
  res.json(result.rows);
});

app.post("/api/crm/deals", async (req, res) => {
  const clientId = parseId(req.body?.clientId);
  const title = validateDealField("title", req.body?.title);
  const amount = validateDealField("amount", req.body?.amount);
  const currency = validateDealField("currency", req.body?.currency || "MXN");
  const stage = validateDealField("stage", req.body?.stage || "lead");
  const expectedClose = validateDealField(
    "expected_close",
    req.body?.expectedClose ?? null,
  );
  if (
    !clientId ||
    !title ||
    !currency ||
    !stage ||
    amount === undefined ||
    expectedClose === undefined
  ) {
    return sendError(res, 400, "Invalid deal fields");
  }
  if (!(await findOwnedClient(clientId, req.traccarUser.id))) {
    return sendError(res, 404, "Client not found");
  }
  const result = await pool.query(
    `INSERT INTO tc_crm_deals (client_id, title, amount, currency, stage, expected_close)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, client_id, title, amount, currency, stage, expected_close, created_at, updated_at`,
    [clientId, title, amount, currency, stage, expectedClose],
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/crm/deals/:id", async (req, res) => {
  const dealId = parseId(req.params.id);
  if (!dealId) return sendError(res, 400, "Invalid deal id");
  const columns = {
    clientId: "client_id",
    title: "title",
    amount: "amount",
    currency: "currency",
    stage: "stage",
    expectedClose: "expected_close",
  };
  const assignments = [];
  const values = [dealId, req.traccarUser.id];
  for (const [input, column] of Object.entries(columns)) {
    if (!Object.hasOwn(req.body || {}, input)) continue;
    let value;
    if (input === "clientId") {
      value = parseId(req.body[input]);
      if (!value || !(await findOwnedClient(value, req.traccarUser.id))) {
        return sendError(res, 404, "Client not found");
      }
    } else {
      value = validateDealField(
        column,
        input === "expectedClose" ? req.body[input] : req.body[input],
      );
    }
    if (value === undefined || (input === "title" && !value)) {
      return sendError(res, 400, "Invalid deal fields");
    }
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }
  if (!assignments.length) return sendError(res, 400, "No fields to update");
  assignments.push("updated_at = NOW()");
  const result = await pool.query(
    `UPDATE tc_crm_deals d SET ${assignments.join(", ")}
     FROM tc_crm_clients c
     WHERE d.id = $1 AND d.client_id = c.id AND c.owner_id = $2
     RETURNING d.id, d.client_id, d.title, d.amount, d.currency, d.stage,
       d.expected_close, d.created_at, d.updated_at`,
    values,
  );
  if (!result.rowCount) return sendError(res, 404, "Deal not found");
  res.json(result.rows[0]);
});

app.delete("/api/crm/deals/:id", async (req, res) => {
  const dealId = parseId(req.params.id);
  if (!dealId) return sendError(res, 400, "Invalid deal id");
  const result = await pool.query(
    `DELETE FROM tc_crm_deals d USING tc_crm_clients c
     WHERE d.id = $1 AND d.client_id = c.id AND c.owner_id = $2
     RETURNING d.id`,
    [dealId, req.traccarUser.id],
  );
  if (!result.rowCount) return sendError(res, 404, "Deal not found");
  res.status(204).end();
});

app.get("/api/crm/tickets", async (req, res) => {
  const clientId = req.query.clientId ? parseId(req.query.clientId) : null;
  if (req.query.clientId && !clientId)
    return sendError(res, 400, "Invalid client id");
  const result = await pool.query(
    `SELECT t.id, t.client_id, c.name AS client_name, t.subject, t.description,
      t.status, t.priority, t.created_at, t.closed_at
     FROM tc_crm_tickets t JOIN tc_crm_clients c ON c.id = t.client_id
     WHERE c.owner_id = $1 AND ($2::int IS NULL OR t.client_id = $2)
     ORDER BY t.created_at DESC, t.id DESC`,
    [req.traccarUser.id, clientId],
  );
  res.json(result.rows);
});

app.post("/api/crm/tickets", async (req, res) => {
  const clientId = parseId(req.body?.clientId);
  const subject = optionalText(req.body?.subject);
  const description = optionalText(req.body?.description);
  const status = req.body?.status || "open";
  const priority = req.body?.priority || "normal";
  if (
    !clientId ||
    !subject ||
    description === undefined ||
    !ticketStatuses.includes(status) ||
    !ticketPriorities.includes(priority)
  ) {
    return sendError(res, 400, "Invalid ticket fields");
  }
  if (!(await findOwnedClient(clientId, req.traccarUser.id))) {
    return sendError(res, 404, "Client not found");
  }
  const result = await pool.query(
    `INSERT INTO tc_crm_tickets (client_id, subject, description, status, priority, closed_at)
     VALUES ($1, $2, $3, $4, $5, CASE WHEN $4 = 'closed' THEN NOW() END)
     RETURNING id, client_id, subject, description, status, priority, created_at, closed_at`,
    [clientId, subject, description, status, priority],
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/crm/tickets/:id", async (req, res) => {
  const ticketId = parseId(req.params.id);
  if (!ticketId) return sendError(res, 400, "Invalid ticket id");
  const fields = {
    clientId: { column: "client_id", parse: parseId },
    subject: { column: "subject", parse: optionalText },
    description: { column: "description", parse: optionalText },
    status: {
      column: "status",
      parse: (v) => (ticketStatuses.includes(v) ? v : undefined),
    },
    priority: {
      column: "priority",
      parse: (v) => (ticketPriorities.includes(v) ? v : undefined),
    },
  };
  const assignments = [];
  const values = [ticketId, req.traccarUser.id];
  let statusParam;
  for (const [input, { column, parse }] of Object.entries(fields)) {
    if (!Object.hasOwn(req.body || {}, input)) continue;
    const value = parse(req.body[input]);
    if (value === undefined || (input === "subject" && !value))
      return sendError(res, 400, "Invalid ticket fields");
    if (
      input === "clientId" &&
      !(await findOwnedClient(value, req.traccarUser.id))
    ) {
      return sendError(res, 404, "Client not found");
    }
    values.push(value);
    if (input === "status") statusParam = `$${values.length}`;
    assignments.push(`${column} = $${values.length}`);
  }
  if (!assignments.length) return sendError(res, 400, "No fields to update");
  const statusValue = statusParam || "status";
  assignments.push(
    `closed_at = CASE WHEN ${statusValue} = 'closed' THEN COALESCE(closed_at, NOW()) ELSE NULL END`,
  );
  const result = await pool.query(
    `UPDATE tc_crm_tickets t SET ${assignments.join(", ")}
     FROM tc_crm_clients c
     WHERE t.id = $1 AND t.client_id = c.id AND c.owner_id = $2
     RETURNING t.id, t.client_id, t.subject, t.description, t.status, t.priority, t.created_at, t.closed_at`,
    values,
  );
  if (!result.rowCount) return sendError(res, 404, "Ticket not found");
  res.json(result.rows[0]);
});

app.delete("/api/crm/tickets/:id", async (req, res) => {
  const ticketId = parseId(req.params.id);
  if (!ticketId) return sendError(res, 400, "Invalid ticket id");
  const result = await pool.query(
    `DELETE FROM tc_crm_tickets t USING tc_crm_clients c
     WHERE t.id = $1 AND t.client_id = c.id AND c.owner_id = $2 RETURNING t.id`,
    [ticketId, req.traccarUser.id],
  );
  if (!result.rowCount) return sendError(res, 404, "Ticket not found");
  res.status(204).end();
});

const ownedReminderQuery = `
  SELECT r.id, r.client_id, c.name AS client_name, r.deal_id, r.ticket_id,
    r.title, r.due_at, r.done, r.created_at
  FROM tc_crm_reminders r JOIN tc_crm_clients c ON c.id = r.client_id`;

app.get("/api/crm/reminders/upcoming", async (req, res) => {
  const result = await pool.query(
    `${ownedReminderQuery}
     WHERE c.owner_id = $1 AND r.done = FALSE AND r.due_at >= NOW()
     ORDER BY r.due_at ASC LIMIT 100`,
    [req.traccarUser.id],
  );
  res.json(result.rows);
});

app.get("/api/crm/reminders", async (req, res) => {
  const done = req.query.done === undefined ? null : req.query.done === "true";
  if (
    req.query.done !== undefined &&
    !["true", "false"].includes(req.query.done)
  ) {
    return sendError(res, 400, "Invalid done filter");
  }
  const result = await pool.query(
    `${ownedReminderQuery}
     WHERE c.owner_id = $1 AND ($2::boolean IS NULL OR r.done = $2)
     ORDER BY r.due_at ASC, r.id ASC LIMIT 250`,
    [req.traccarUser.id, done],
  );
  res.json(result.rows);
});

const validateReminderLinks = async (clientId, dealId, ticketId, ownerId) => {
  if (dealId) {
    const result = await pool.query(
      `SELECT 1 FROM tc_crm_deals d JOIN tc_crm_clients c ON c.id = d.client_id
       WHERE d.id = $1 AND d.client_id = $2 AND c.owner_id = $3`,
      [dealId, clientId, ownerId],
    );
    if (!result.rowCount) return false;
  }
  if (ticketId) {
    const result = await pool.query(
      `SELECT 1 FROM tc_crm_tickets t JOIN tc_crm_clients c ON c.id = t.client_id
       WHERE t.id = $1 AND t.client_id = $2 AND c.owner_id = $3`,
      [ticketId, clientId, ownerId],
    );
    if (!result.rowCount) return false;
  }
  return true;
};

app.post("/api/crm/reminders", async (req, res) => {
  const clientId = parseId(req.body?.clientId);
  const dealId = req.body?.dealId ? parseId(req.body.dealId) : null;
  const ticketId = req.body?.ticketId ? parseId(req.body.ticketId) : null;
  const title = optionalText(req.body?.title);
  const dueAt = req.body?.dueAt;
  if (
    !clientId ||
    !title ||
    !validDateTime(dueAt) ||
    (req.body?.dealId && !dealId) ||
    (req.body?.ticketId && !ticketId)
  ) {
    return sendError(res, 400, "Invalid reminder fields");
  }
  if (!(await findOwnedClient(clientId, req.traccarUser.id)))
    return sendError(res, 404, "Client not found");
  if (
    !(await validateReminderLinks(
      clientId,
      dealId,
      ticketId,
      req.traccarUser.id,
    ))
  ) {
    return sendError(res, 400, "Reminder link does not belong to this client");
  }
  const result = await pool.query(
    `INSERT INTO tc_crm_reminders (client_id, deal_id, ticket_id, title, due_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, client_id, deal_id, ticket_id, title, due_at, done, created_at`,
    [clientId, dealId, ticketId, title, dueAt],
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/crm/reminders/:id", async (req, res) => {
  const reminderId = parseId(req.params.id);
  if (!reminderId) return sendError(res, 400, "Invalid reminder id");
  const current = await pool.query(
    `SELECT r.client_id, r.deal_id, r.ticket_id FROM tc_crm_reminders r
     JOIN tc_crm_clients c ON c.id = r.client_id
     WHERE r.id = $1 AND c.owner_id = $2`,
    [reminderId, req.traccarUser.id],
  );
  if (!current.rowCount) return sendError(res, 404, "Reminder not found");
  const next = { ...current.rows[0] };
  const assignments = [];
  const values = [reminderId, req.traccarUser.id];
  const fields = ["title", "dueAt", "done", "clientId", "dealId", "ticketId"];
  const columns = {
    title: "title",
    dueAt: "due_at",
    done: "done",
    clientId: "client_id",
    dealId: "deal_id",
    ticketId: "ticket_id",
  };
  for (const field of fields) {
    if (!Object.hasOwn(req.body || {}, field)) continue;
    let value = req.body[field];
    if (field === "title") value = optionalText(value);
    if (field === "dueAt" && !validDateTime(value)) value = undefined;
    if (field === "done" && typeof value !== "boolean") value = undefined;
    if (["clientId", "dealId", "ticketId"].includes(field)) {
      value = value === null && field !== "clientId" ? null : parseId(value);
      if (
        field === "clientId" &&
        value &&
        !(await findOwnedClient(value, req.traccarUser.id))
      ) {
        return sendError(res, 404, "Client not found");
      }
    }
    if (
      value === undefined ||
      (field === "title" && !value) ||
      (field === "clientId" && !value)
    ) {
      return sendError(res, 400, "Invalid reminder fields");
    }
    values.push(value);
    assignments.push(`${columns[field]} = $${values.length}`);
    next[columns[field]] = value;
  }
  if (!assignments.length) return sendError(res, 400, "No fields to update");
  if (
    !(await validateReminderLinks(
      next.client_id,
      next.deal_id,
      next.ticket_id,
      req.traccarUser.id,
    ))
  ) {
    return sendError(res, 400, "Reminder link does not belong to this client");
  }
  const result = await pool.query(
    `UPDATE tc_crm_reminders r SET ${assignments.join(", ")}
     FROM tc_crm_clients c WHERE r.id = $1 AND r.client_id = c.id AND c.owner_id = $2
     RETURNING r.id, r.client_id, r.deal_id, r.ticket_id, r.title, r.due_at, r.done, r.created_at`,
    values,
  );
  res.json(result.rows[0]);
});

app.delete("/api/crm/reminders/:id", async (req, res) => {
  const reminderId = parseId(req.params.id);
  if (!reminderId) return sendError(res, 400, "Invalid reminder id");
  const result = await pool.query(
    `DELETE FROM tc_crm_reminders r USING tc_crm_clients c
     WHERE r.id = $1 AND r.client_id = c.id AND c.owner_id = $2 RETURNING r.id`,
    [reminderId, req.traccarUser.id],
  );
  if (!result.rowCount) return sendError(res, 404, "Reminder not found");
  res.status(204).end();
});

app.get("/api/crm/invoices", async (req, res) => {
  const clientId = req.query.clientId ? parseId(req.query.clientId) : null;
  if (req.query.clientId && !clientId)
    return sendError(res, 400, "Invalid client id");
  const result = await pool.query(
    `SELECT i.id, i.client_id, c.name AS client_name, i.number, i.amount,
      i.currency, i.status, i.issued_at, i.paid_at
     FROM tc_crm_invoices i JOIN tc_crm_clients c ON c.id = i.client_id
     WHERE c.owner_id = $1 AND ($2::int IS NULL OR i.client_id = $2)
     ORDER BY i.issued_at DESC, i.id DESC`,
    [req.traccarUser.id, clientId],
  );
  res.json(result.rows);
});

app.post("/api/crm/invoices", async (req, res) => {
  const clientId = parseId(req.body?.clientId);
  const number = optionalText(req.body?.number);
  const amount = Number(req.body?.amount);
  const currency = (optionalText(req.body?.currency) || "MXN").toUpperCase();
  const status = req.body?.status || "pending";
  const issuedAt = req.body?.issuedAt || new Date().toISOString().slice(0, 10);
  const paidAt = req.body?.paidAt || null;
  if (
    !clientId ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    !/^[A-Z]{3}$/.test(currency) ||
    !invoiceStatuses.includes(status) ||
    !validDate(issuedAt) ||
    (paidAt && !validDate(paidAt))
  ) {
    return sendError(res, 400, "Invalid invoice fields");
  }
  if (!(await findOwnedClient(clientId, req.traccarUser.id)))
    return sendError(res, 404, "Client not found");
  const result = await pool.query(
    `INSERT INTO tc_crm_invoices (client_id, number, amount, currency, status, issued_at, paid_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, client_id, number, amount, currency, status, issued_at, paid_at`,
    [clientId, number, amount, currency, status, issuedAt, paidAt],
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/crm/invoices/:id", async (req, res) => {
  const invoiceId = parseId(req.params.id);
  if (!invoiceId) return sendError(res, 400, "Invalid invoice id");
  const fields = {
    clientId: "client_id",
    number: "number",
    amount: "amount",
    currency: "currency",
    status: "status",
    issuedAt: "issued_at",
    paidAt: "paid_at",
  };
  const assignments = [];
  const values = [invoiceId, req.traccarUser.id];
  for (const [input, column] of Object.entries(fields)) {
    if (!Object.hasOwn(req.body || {}, input)) continue;
    let value = req.body[input];
    if (input === "clientId") {
      value = parseId(value);
      if (!value || !(await findOwnedClient(value, req.traccarUser.id)))
        return sendError(res, 404, "Client not found");
    } else if (input === "number") {
      value = optionalText(value);
      if (value === undefined)
        return sendError(res, 400, "Invalid invoice number");
    } else if (input === "amount") {
      value = Number(value);
      if (!Number.isFinite(value) || value < 0)
        return sendError(res, 400, "Invalid invoice amount");
    } else if (input === "currency") {
      value = optionalText(value)?.toUpperCase();
      if (!value || !/^[A-Z]{3}$/.test(value))
        return sendError(res, 400, "Invalid invoice currency");
    } else if (input === "status") {
      if (!invoiceStatuses.includes(value))
        return sendError(res, 400, "Invalid invoice status");
    } else if (["issuedAt", "paidAt"].includes(input)) {
      if (value === "") value = null;
      if (value !== null && !validDate(value))
        return sendError(res, 400, "Invalid invoice date");
    }
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }
  if (!assignments.length) return sendError(res, 400, "No fields to update");
  const result = await pool.query(
    `UPDATE tc_crm_invoices i SET ${assignments.join(", ")}
     FROM tc_crm_clients c
     WHERE i.id = $1 AND i.client_id = c.id AND c.owner_id = $2
     RETURNING i.id, i.client_id, i.number, i.amount, i.currency, i.status, i.issued_at, i.paid_at`,
    values,
  );
  if (!result.rowCount) return sendError(res, 404, "Invoice not found");
  res.json(result.rows[0]);
});

app.delete("/api/crm/invoices/:id", async (req, res) => {
  const invoiceId = parseId(req.params.id);
  if (!invoiceId) return sendError(res, 400, "Invalid invoice id");
  const result = await pool.query(
    `DELETE FROM tc_crm_invoices i USING tc_crm_clients c
     WHERE i.id = $1 AND i.client_id = c.id AND c.owner_id = $2 RETURNING i.id`,
    [invoiceId, req.traccarUser.id],
  );
  if (!result.rowCount) return sendError(res, 404, "Invoice not found");
  res.status(204).end();
});

app.use((error, _req, res, _next) => {
  console.error("CRM API error:", error.message);
  void _next;
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

const start = async () => {
  const migration = await fs.readFile(
    path.join(dirname, "migrations", "001_init.sql"),
    "utf8",
  );
  await pool.query(migration);
  const userLinkMigration = await fs.readFile(
    path.join(dirname, "migrations", "002_add_traccar_user.sql"),
    "utf8",
  );
  await pool.query(userLinkMigration);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CRM API listening on ${PORT}`);
  });
};

start().catch((error) => {
  console.error("CRM API startup failed:", error.message);
  process.exitCode = 1;
});
