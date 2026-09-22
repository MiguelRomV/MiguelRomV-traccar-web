CREATE TABLE IF NOT EXISTS tc_crm_clients (
  id SERIAL PRIMARY KEY,
  owner_id INT NOT NULL REFERENCES tc_users(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_clients_owner
  ON tc_crm_clients(owner_id, name);

CREATE TABLE IF NOT EXISTS tc_crm_client_devices (
  client_id INT REFERENCES tc_crm_clients(id) ON DELETE CASCADE,
  device_id INT REFERENCES tc_devices(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, device_id)
);

CREATE TABLE IF NOT EXISTS tc_crm_messages (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES tc_crm_clients(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('in','out')),
  body TEXT,
  wa_message_id TEXT UNIQUE,
  device_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_msg_client
  ON tc_crm_messages(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tc_crm_deals (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES tc_crm_clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'MXN',
  stage TEXT DEFAULT 'lead',
  expected_close DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tc_crm_tickets (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES tc_crm_clients(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tc_crm_reminders (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES tc_crm_clients(id) ON DELETE CASCADE,
  deal_id INT REFERENCES tc_crm_deals(id) ON DELETE SET NULL,
  ticket_id INT REFERENCES tc_crm_tickets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tc_crm_invoices (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES tc_crm_clients(id) ON DELETE CASCADE,
  number TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'MXN',
  status TEXT DEFAULT 'pending',
  issued_at DATE DEFAULT CURRENT_DATE,
  paid_at DATE
);
