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

app.get("/api/crm/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/crm", authenticate);

app.get("/api/crm/clients", async (req, res) => {
  const result = await pool.query(
    `SELECT c.id, c.name, c.phone, c.email, c.notes, c.created_at, c.updated_at,
      COALESCE(
        json_agg(json_build_object('id', d.id, 'name', d.name, 'uniqueId', d.uniqueid)
          ORDER BY d.name) FILTER (WHERE d.id IS NOT NULL),
        '[]'::json
      ) AS devices
     FROM tc_crm_clients c
     LEFT JOIN tc_crm_client_devices cd ON cd.client_id = c.id
     LEFT JOIN tc_devices d ON d.id = cd.device_id
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
      COALESCE(
        json_agg(json_build_object('id', d.id, 'name', d.name, 'uniqueId', d.uniqueid)
          ORDER BY d.name) FILTER (WHERE d.id IS NOT NULL),
        '[]'::json
      ) AS devices
     FROM tc_crm_clients c
     LEFT JOIN tc_crm_client_devices cd ON cd.client_id = c.id
     LEFT JOIN tc_devices d ON d.id = cd.device_id
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
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CRM API listening on ${PORT}`);
  });
};

start().catch((error) => {
  console.error("CRM API startup failed:", error.message);
  process.exitCode = 1;
});
