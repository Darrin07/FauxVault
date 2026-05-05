CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  module_name VARCHAR(50) NOT NULL UNIQUE,
  is_vulnerable BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO settings (module_name, is_vulnerable) VALUES
  ('sql_injection', FALSE),
  ('xss_stored', FALSE),
  ('xss_reflected', FALSE),
  ('brute_force', FALSE),
  ('verbose_errors', FALSE),
  ('weak_password_storage', FALSE),
  ('weak_session_tokens', FALSE),
  ('bola', FALSE),
  ('privilege_escalation', FALSE),
  ('excessive_data_exposure', FALSE);
