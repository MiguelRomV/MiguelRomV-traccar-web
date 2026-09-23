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
export const sendMessage = (clientId, body) =>
  request(`/clients/${clientId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
export const listDeals = (clientId) =>
  request(`/deals${clientId ? `?clientId=${clientId}` : ""}`);
export const getDealsBoard = () => request("/deals/board");
export const createDeal = (deal) => request("/deals", json(deal));
export const updateDeal = (id, deal) =>
  request(`/deals/${id}`, { method: "PUT", body: JSON.stringify(deal) });
export const deleteDeal = (id) => request(`/deals/${id}`, { method: "DELETE" });
export const listTickets = (clientId) =>
  request(`/tickets${clientId ? `?clientId=${clientId}` : ""}`);
export const createTicket = (ticket) => request("/tickets", json(ticket));
export const updateTicket = (id, ticket) =>
  request(`/tickets/${id}`, { method: "PUT", body: JSON.stringify(ticket) });
export const deleteTicket = (id) =>
  request(`/tickets/${id}`, { method: "DELETE" });
export const listReminders = (done) =>
  request(`/reminders${done === undefined ? "" : `?done=${done}`}`);
export const listUpcomingReminders = () => request("/reminders/upcoming");
export const createReminder = (reminder) =>
  request("/reminders", json(reminder));
export const updateReminder = (id, reminder) =>
  request(`/reminders/${id}`, {
    method: "PUT",
    body: JSON.stringify(reminder),
  });
export const deleteReminder = (id) =>
  request(`/reminders/${id}`, { method: "DELETE" });
export const listInvoices = (clientId) =>
  request(`/invoices${clientId ? `?clientId=${clientId}` : ""}`);
export const createInvoice = (invoice) => request("/invoices", json(invoice));
export const updateInvoice = (id, invoice) =>
  request(`/invoices/${id}`, { method: "PUT", body: JSON.stringify(invoice) });
export const deleteInvoice = (id) =>
  request(`/invoices/${id}`, { method: "DELETE" });
