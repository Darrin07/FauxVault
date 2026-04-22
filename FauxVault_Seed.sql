-- 0. Restart
TRUNCATE users, accounts, transactions, vulnerability_settings RESTART IDENTITY CASCADE;

-- 1. Seed Users
INSERT INTO users (username, email, password_plaintext, password_md5, password_bcrypt, role)
VALUES 
('admin', 'edmin@fauxvault.com', 'AdminPass123', 'a1c7f67b09808249b3a2dce888784324', '$2b$10$K9p/aT3W6UvR6zG1.K9.O.XyC3K5G7H8I9J0K1L2M3N4O5P6Q7R8S', 'admin'),
('test_user', 'test.user@example.com', 'Password123', '42f749ade7f9e195bf475f37a44cafcb', '$2b$10$vI8tYnKo/3D.6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6', 'user');

-- 2. Seed Accounts
INSERT INTO accounts (user_id, account_number, balance, account_type)
VALUES 
(1, 'FV-ADMIN-001', 10000.00, 'savings'),
(2, 'FV-USER-002', 500.50, 'checking');

-- 3. Seed a Sample Transaction
INSERT INTO transactions (sender_account_id, receiver_account_id, amount, reference)
VALUES (1, 2, 50.00, 'Initial setup transfer');

-- 4. Seed Vulnerability Toggles
INSERT INTO vulnerability_settings (module_key, is_vulnerable)
VALUES 
('sql_injection', FALSE),
('bola_idor', FALSE),
('brute_force', FALSE),
('xss_stored', FALSE),
('xss_reflected', FALSE),
('verbose_errors', FALSE),
('mass_assignment', FALSE),
('weak_passwords', FALSE),
('privilege_escalation', FALSE),
('weak_sessions', FALSE)
