/**
 * VigilaTeh - Webhooks para integraciones externas (n8n)
 * Configurar VITE_WEBHOOK_WHATSAPP en .env.local
 */
const WEBHOOK_WHATSAPP = import.meta.env.VITE_WEBHOOK_WHATSAPP || '';

export const isWhatsAppEnabled = () => Boolean(WEBHOOK_WHATSAPP);

export const notifyWhatsApp = async (payload) => {
  if (!isWhatsAppEnabled()) {
    console.warn('[VigilaTeh] WhatsApp webhook no configurado');
    return { ok: false, reason: 'not_configured' };
  }
  try {
    const res = await fetch(WEBHOOK_WHATSAPP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'vigilateh',
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.error('[VigilaTeh] Error webhook WhatsApp', err);
    return { ok: false, reason: 'network_error' };
  }
};
