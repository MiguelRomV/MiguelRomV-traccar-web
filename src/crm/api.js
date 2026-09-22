const baseUrl = "/api/crm";

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `${response.status} ${response.statusText}`);
  }
  return response.status === 204 ? null : response.json();
};

const json = (body) => ({ method: "POST", body: JSON.stringify(body) });

export const listClients = () => request("/clients");
export const createClient = (client) => request("/clients", json(client));
export const updateClient = (id, client) =>
  request(`/clients/${id}`, { method: "PUT", body: JSON.stringify(client) });
export const deleteClient = (id) =>
  request(`/clients/${id}`, { method: "DELETE" });
export const linkDevice = (id, deviceId) =>
  request(`/clients/${id}/devices`, json({ deviceId }));
export const unlinkDevice = (id, deviceId) =>
  request(`/clients/${id}/devices/${deviceId}`, { method: "DELETE" });
export const listMessages = (clientId, limit = 50, offset = 0) =>
  request(
    `/clients/${clientId}/messages?${new URLSearchParams({ limit, offset })}`,
  );
export const syncMessages = (clientId) =>
  request(`/clients/${clientId}/messages/sync`, { method: "POST" });
