CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  module_name VARCHAR(50) NOT NULL UNIQUE,
  is_vulnerable BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO settings (module_name, is_vulnerable) VALUES
  ('sql_injection', TRUE),
  ('xss_stored', TRUE),
  ('xss_reflected', TRUE),
  ('brute_force', TRUE),
  ('verbose_errors', TRUE),
  ('weak_password_storage', TRUE),
  ('weak_session_tokens', TRUE),
  ('bola', TRUE),
  ('privilege_escalation', TRUE),
  ('excessive_data_exposure', TRUE);