ALTER TABLE tc_crm_clients
  ADD COLUMN IF NOT EXISTS traccar_user_id INT
  REFERENCES tc_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_clients_traccar_user
  ON tc_crm_clients(traccar_user_id);
