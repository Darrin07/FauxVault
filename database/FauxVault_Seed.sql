-- 0. Restart
TRUNCATE users, accounts, transactions, vulnerability_settings RESTART IDENTITY CASCADE;

-- 1. Seed Users
-- Passwords: admin = 'AdminPass123', test_user = 'Password123'
-- Bcrypt hashes generated with bcryptjs (salt rounds = 10)
INSERT INTO users (username, email, name, password_plaintext, password_md5, password_bcrypt, role)
VALUES
('admin', 'admin@fauxvault.com', 'Admin User', 'AdminPass123', 'a1c7f67b09808249b3a2dce888784324', '$2b$10$eir2VzXdvLT36H7L9rl.1u.UnTuO/g0yMRnLYj0QWKft1mCFMdfm6', 'admin'),
('test_user', 'test.user@example.com', 'Test User', 'Password123', '42f749ade7f9e195bf475f37a44cafcb', '$2b$10$F2Egr5GdMJ/uj9CtWWZTleAfSANq8L.MqtQnPnFPCpPKCGnqi18QK', 'user');

-- 2. Seed Accounts
INSERT INTO accounts (user_id, account_number, balance, account_type)
VALUES
(1, 'FV-ADMIN-001', 10000.00, 'savings'),
(2, 'FV-USER-002', 500.50, 'checking');

-- 3. Seed a Sample Transaction
INSERT INTO transactions (sender_account_id, receiver_account_id, amount, reference)
VALUES (1, 2, 50.00, 'Initial setup transfer');

-- 4. Seed Vulnerability Toggles
-- Default to TRUE (vulnerable mode) per project spec R1.3.1
-- Module keys use OWASP category IDs for consistency with toggle middleware
INSERT INTO vulnerability_settings (module_key, is_vulnerable)
VALUES
('a01-broken-access-control', TRUE),
('a02-security-misconfiguration', TRUE),
('a03-injection-sql', TRUE),
('a04-cryptographic-failures', TRUE),
('a05-xss-stored', TRUE),
('a05-xss-reflected', TRUE),
('a07-auth-failures', TRUE),
('a07-brute-force', TRUE),
('api3-excessive-data-exposure', TRUE),
('api5-broken-function-auth', TRUE);
