/**
 * VigilaTeh - Webhooks para integraciones externas (n8n)
 * Configurar VITE_WEBHOOK_WHATSAPP en .env.local
 */
const WEBHOOK_WHATSAPP = import.meta.env.VITE_WEBHOOK_WHATSAPP || "";

export const isWhatsAppEnabled = () => Boolean(WEBHOOK_WHATSAPP);

export const notifyWhatsApp = async (payload) => {
  if (!isWhatsAppEnabled()) {
    console.warn("[VigilaTeh] WhatsApp webhook no configurado");
    return { ok: false, reason: "not_configured" };
  }
  try {
    const res = await fetch(WEBHOOK_WHATSAPP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "vigilateh",
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.error("[VigilaTeh] Error webhook WhatsApp", err);
    return { ok: false, reason: "network_error" };
  }
};

export const sendWhatsApp = async ({ to, message, deviceId }) => {
  if (!isWhatsAppEnabled())
    return { ok: false, reason: "webhook_no_configurado" };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(WEBHOOK_WHATSAPP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ to, message, deviceId, source: "vigilateh" }),
      });
      if (response.ok) return { ok: true, status: response.status };
    } catch {
      /* retry */
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < 2)
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
  }
  return { ok: false, reason: "webhook_error" };
};
