-- 0. Restart
-- Disable RLS temporarily to allow seeding
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
-- Clean tables
TRUNCATE users, accounts, transactions, vulnerability_settings CASCADE;

-- 1. Seed Users
-- Passwords: admin = 'AdminPass123', test_user = 'Password123'
-- Bcrypt hashes generated with bcryptjs (salt rounds = 10)
INSERT INTO users (username, email, name, password_plaintext, password_md5, password_bcrypt, role)
VALUES
('admin', 'admin@fauxvault.com', 'Admin User', 'AdminPass123', 'a1c7f67b09808249b3a2dce888784324', '$2b$10$eir2VzXdvLT36H7L9rl.1u.UnTuO/g0yMRnLYj0QWKft1mCFMdfm6', 'admin'),
('test_user', 'test.user@example.com', 'Test User', 'Password123', '42f749ade7f9e195bf475f37a44cafcb', '$2b$10$F2Egr5GdMJ/uj9CtWWZTleAfSANq8L.MqtQnPnFPCpPKCGnqi18QK', 'user');

-- 2. Seed Accounts (reference users by subquery since UUIDs are auto-generated)
INSERT INTO accounts (user_id, account_number, balance, account_type)
VALUES
((SELECT user_id FROM users WHERE username = 'admin'), 'FV-ADMIN-001', 10000.00, 'savings'),
((SELECT user_id FROM users WHERE username = 'test_user'), 'FV-USER-002', 500.50, 'checking');

-- 3. Seed a Sample Transaction
INSERT INTO transactions (sender_account_id, receiver_account_id, amount, reference)
VALUES (
  (SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'),
  (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'),
  50.00, 'Initial setup transfer'
);

-- 4. Seed Vulnerability Toggles
-- Default to TRUE (vulnerable mode) per project spec R1.3.1
-- module_key = OWASP category ID, module_name = code-facing short name
-- See references/OWASP_Module_Mapping.md for full mapping details
INSERT INTO vulnerability_settings (module_key, module_name, is_vulnerable)
VALUES
('a01-broken-access-control', 'bola', TRUE),
('a02-cryptographic-failures', 'weak_password_storage', TRUE),
('a03-injection-sql', 'sql_injection', TRUE),
('a03-xss-stored', 'xss_stored', TRUE),
('a03-xss-reflected', 'xss_reflected', TRUE),
('a05-security-misconfiguration', 'verbose_errors', TRUE),
('a07-auth-failures', 'weak_session_tokens', TRUE),
('a07-brute-force', 'brute_force', TRUE),
('api3-excessive-data-exposure', 'excessive_data_exposure', TRUE),
('api5-broken-function-auth', 'privilege_escalation', TRUE);

-- Re-enable RLS once seeding is complete
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
