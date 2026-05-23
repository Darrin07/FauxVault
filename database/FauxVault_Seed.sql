-- Restart
-- Disable RLS temporarily to allow seeding
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
-- Clean tables
TRUNCATE users, accounts, transactions, vulnerability_settings, user_vulnerability_settings CASCADE;

-- Seed Users
-- Passwords: admin = 'AdminPass123', all others = 'Password123'
-- Bcrypt hashes generated with bcryptjs (salt rounds = 10)
INSERT INTO users (username, email, name, password_plaintext, password_md5, password_bcrypt, role)
VALUES
('admin',       'admin@fauxvault.com',       'Admin User',    'AdminPass123', 'a1c7f67b09808249b3a2dce888784324', '$2b$10$eir2VzXdvLT36H7L9rl.1u.UnTuO/g0yMRnLYj0QWKft1mCFMdfm6', 'admin'),
('test_user',   'test.user@example.com',     'Test User',     'Password123',  '42f749ade7f9e195bf475f37a44cafcb', '$2b$10$F2Egr5GdMJ/uj9CtWWZTleAfSANq8L.MqtQnPnFPCpPKCGnqi18QK', 'user'),
('test_user_2', 'test.user2@example.com',    'Test User Two', 'Password123',  '42f749ade7f9e195bf475f37a44cafcb', '$2b$10$lCfZpHc2PwQLw3/MfPyy8OGCtnLJxYG.LeMuGuMVcpOUvjT8mdBR2', 'user'),
('alice_j',     'alice.jones@example.com',   'Alice Jones',   'Password123',  '42f749ade7f9e195bf475f37a44cafcb', '$2b$10$F2Egr5GdMJ/uj9CtWWZTleAfSANq8L.MqtQnPnFPCpPKCGnqi18QK', 'user'),
('bob_k',       'bob.kim@example.com',       'Bob Kim',       'Password123',  '42f749ade7f9e195bf475f37a44cafcb', '$2b$10$F2Egr5GdMJ/uj9CtWWZTleAfSANq8L.MqtQnPnFPCpPKCGnqi18QK', 'user'),
('carol_w',     'carol.white@example.com',   'Carol White',   'Password123',  '42f749ade7f9e195bf475f37a44cafcb', '$2b$10$F2Egr5GdMJ/uj9CtWWZTleAfSANq8L.MqtQnPnFPCpPKCGnqi18QK', 'user'),
('dave_b',      'dave.brown@example.com',    'Dave Brown',    'Password123',  '42f749ade7f9e195bf475f37a44cafcb', '$2b$10$F2Egr5GdMJ/uj9CtWWZTleAfSANq8L.MqtQnPnFPCpPKCGnqi18QK', 'user'),
('eve_m',       'eve.miller@example.com',    'Eve Miller',    'Password123',  '42f749ade7f9e195bf475f37a44cafcb', '$2b$10$F2Egr5GdMJ/uj9CtWWZTleAfSANq8L.MqtQnPnFPCpPKCGnqi18QK', 'user'),
('frank_d',     'frank.davis@example.com',   'Frank Davis',   'Password123',  '42f749ade7f9e195bf475f37a44cafcb', '$2b$10$F2Egr5GdMJ/uj9CtWWZTleAfSANq8L.MqtQnPnFPCpPKCGnqi18QK', 'user'),
('grace_h',     'grace.hall@example.com',    'Grace Hall',    'Password123',  '42f749ade7f9e195bf475f37a44cafcb', '$2b$10$F2Egr5GdMJ/uj9CtWWZTleAfSANq8L.MqtQnPnFPCpPKCGnqi18QK', 'user');

-- Seed Accounts (reference users by subquery since UUIDs are auto-generated)
INSERT INTO accounts (user_id, account_number, balance, account_type)
VALUES
((SELECT user_id FROM users WHERE username = 'admin'),       'FV-ADMIN-001', 5000.00, 'savings'),
((SELECT user_id FROM users WHERE username = 'test_user'),   'FV-USER-002',  1000.00, 'checking'),
((SELECT user_id FROM users WHERE username = 'test_user_2'), 'FV-USER-003',   750.00, 'checking'),
((SELECT user_id FROM users WHERE username = 'alice_j'),     'FV-USER-004',  1200.00, 'checking'),
((SELECT user_id FROM users WHERE username = 'bob_k'),       'FV-USER-005',   850.00, 'checking'),
((SELECT user_id FROM users WHERE username = 'carol_w'),     'FV-USER-006',  1100.00, 'checking'),
((SELECT user_id FROM users WHERE username = 'dave_b'),      'FV-USER-007',   950.00, 'checking'),
((SELECT user_id FROM users WHERE username = 'eve_m'),       'FV-USER-008',   800.00, 'checking'),
((SELECT user_id FROM users WHERE username = 'frank_d'),     'FV-USER-009',  1300.00, 'checking'),
((SELECT user_id FROM users WHERE username = 'grace_h'),     'FV-USER-010',   900.00, 'checking');

-- Seed Transactions
-- Dates are offset from CURRENT_TIMESTAMP so history stays realistic after re-seeding
INSERT INTO transactions (sender_account_id, receiver_account_id, amount, reference, transaction_date)
VALUES

-- admin sends
((SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'),  100.00, 'Monthly allowance',          CURRENT_TIMESTAMP - INTERVAL '58 days 3 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-003'),  150.00, 'Welcome bonus',              CURRENT_TIMESTAMP - INTERVAL '55 days 1 hour'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-004'),  200.00, 'Referral reward',            CURRENT_TIMESTAMP - INTERVAL '52 days 4 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-005'),   75.00, 'Prize payment',              CURRENT_TIMESTAMP - INTERVAL '50 days 2 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-006'),  250.00, 'Consulting fee',             CURRENT_TIMESTAMP - INTERVAL '47 days 5 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-007'),  300.00, 'Project bonus',              CURRENT_TIMESTAMP - INTERVAL '44 days 2 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-008'),  175.00, 'Training reimbursement',     CURRENT_TIMESTAMP - INTERVAL '41 days 6 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'),  225.00, 'Equipment allowance',        CURRENT_TIMESTAMP - INTERVAL '38 days 1 hour'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'),  100.00, 'Achievement award',          CURRENT_TIMESTAMP - INTERVAL '35 days 3 hours'),

-- test_user sends
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'), (SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'),   50.00, 'Service payment',            CURRENT_TIMESTAMP - INTERVAL '57 days 4 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-004'),  120.00, 'Dinner split',               CURRENT_TIMESTAMP - INTERVAL '54 days 2 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-006'),   80.00, 'Book purchase',              CURRENT_TIMESTAMP - INTERVAL '51 days 5 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-007'),   45.00, 'Coffee fund',                CURRENT_TIMESTAMP - INTERVAL '48 days 1 hour'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'),  200.00, 'Rent share',                 CURRENT_TIMESTAMP - INTERVAL '45 days 4 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-003'),   45.00, 'Shared expense',             CURRENT_TIMESTAMP - INTERVAL '22 days 2 hours'),

-- test_user_2 sends
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-003'), (SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'),   30.00, 'Fee repayment',              CURRENT_TIMESTAMP - INTERVAL '56 days 6 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-003'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-005'),   90.00, 'Loan repayment',             CURRENT_TIMESTAMP - INTERVAL '53 days 3 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-003'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-008'),   55.00, 'Gym membership split',       CURRENT_TIMESTAMP - INTERVAL '49 days 1 hour'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-003'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'),  110.00, 'Event tickets',              CURRENT_TIMESTAMP - INTERVAL '46 days 5 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-003'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'),   70.00, 'Subscription split',         CURRENT_TIMESTAMP - INTERVAL '43 days 2 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-003'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'),   30.00, 'Change',                     CURRENT_TIMESTAMP - INTERVAL '21 days 4 hours'),

-- alice sends
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-004'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'),   60.00, 'Lunch reimbursement',        CURRENT_TIMESTAMP - INTERVAL '55 days 5 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-004'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-005'),  180.00, 'Shared utility bill',        CURRENT_TIMESTAMP - INTERVAL '52 days 1 hour'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-004'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-006'),   95.00, 'Birthday gift contribution', CURRENT_TIMESTAMP - INTERVAL '49 days 3 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-004'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-007'),   40.00, 'Parking fee',                CURRENT_TIMESTAMP - INTERVAL '46 days 6 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-004'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'),  130.00, 'Project contribution',       CURRENT_TIMESTAMP - INTERVAL '43 days 4 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-004'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'),  155.00, 'Holiday gift',               CURRENT_TIMESTAMP - INTERVAL '18 days 2 hours'),

-- bob sends
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-005'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-004'),  220.00, 'Loan return',                CURRENT_TIMESTAMP - INTERVAL '54 days 4 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-005'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'),   85.00, 'Taxi share',                 CURRENT_TIMESTAMP - INTERVAL '51 days 2 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-005'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-008'),  100.00, 'Sports equipment split',     CURRENT_TIMESTAMP - INTERVAL '48 days 5 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-005'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'),   65.00, 'Grocery split',              CURRENT_TIMESTAMP - INTERVAL '45 days 1 hour'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-005'), (SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'), 150.00, 'Membership dues',            CURRENT_TIMESTAMP - INTERVAL '42 days 3 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-005'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'),   95.00, 'Gaming gear split',          CURRENT_TIMESTAMP - INTERVAL '17 days 5 hours'),

-- carol sends
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-006'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-003'),   45.00, 'Coffee',                     CURRENT_TIMESTAMP - INTERVAL '53 days 2 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-006'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-007'),  160.00, 'Shared tools purchase',      CURRENT_TIMESTAMP - INTERVAL '50 days 4 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-006'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-008'),   75.00, 'Yoga class split',           CURRENT_TIMESTAMP - INTERVAL '47 days 2 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-006'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'),   90.00, 'Phone bill share',           CURRENT_TIMESTAMP - INTERVAL '44 days 5 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-006'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'),  120.00, 'Course reimbursement',       CURRENT_TIMESTAMP - INTERVAL '41 days 1 hour'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-006'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'),   75.00, 'Art supplies',               CURRENT_TIMESTAMP - INTERVAL '16 days 3 hours'),

-- dave sends
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-007'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-006'),   50.00, 'Snacks',                     CURRENT_TIMESTAMP - INTERVAL '52 days 3 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-007'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'),   35.00, 'Streaming share',            CURRENT_TIMESTAMP - INTERVAL '49 days 5 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-007'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-004'),  175.00, 'Furniture contribution',     CURRENT_TIMESTAMP - INTERVAL '46 days 2 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-007'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-008'),  110.00, 'Concert tickets',            CURRENT_TIMESTAMP - INTERVAL '40 days 4 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-007'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'),   80.00, 'Weekend trip expenses',      CURRENT_TIMESTAMP - INTERVAL '43 days 6 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-007'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'),  125.00, 'Moving help',                CURRENT_TIMESTAMP - INTERVAL '15 days 1 hour'),

-- eve sends
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-008'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'),  140.00, 'Joint gift',                 CURRENT_TIMESTAMP - INTERVAL '51 days 6 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-008'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-007'),   60.00, 'Snacks reimbursement',       CURRENT_TIMESTAMP - INTERVAL '47 days 4 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-008'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-003'),   85.00, 'Shared purchase',            CURRENT_TIMESTAMP - INTERVAL '44 days 1 hour'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-008'), (SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'), 200.00, 'Annual subscription',        CURRENT_TIMESTAMP - INTERVAL '41 days 3 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-008'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'),   55.00, 'Book club dues',             CURRENT_TIMESTAMP - INTERVAL '38 days 5 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-008'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-004'),   70.00, 'Online course split',        CURRENT_TIMESTAMP - INTERVAL '14 days 2 hours'),

-- frank sends
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-008'),   95.00, 'Movie night',                CURRENT_TIMESTAMP - INTERVAL '50 days 1 hour'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-002'),   70.00, 'Code review payment',        CURRENT_TIMESTAMP - INTERVAL '47 days 6 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-006'),  115.00, 'Design work',                CURRENT_TIMESTAMP - INTERVAL '44 days 3 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-005'),   45.00, 'Lunch',                      CURRENT_TIMESTAMP - INTERVAL '41 days 5 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-004'),  190.00, 'Photography session',        CURRENT_TIMESTAMP - INTERVAL '38 days 2 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'),   85.00, 'Tutoring session',           CURRENT_TIMESTAMP - INTERVAL '13 days 4 hours'),

-- grace sends
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-007'),  125.00, 'Moving help payment',        CURRENT_TIMESTAMP - INTERVAL '49 days 2 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-009'),   85.00, 'Tutoring payment',           CURRENT_TIMESTAMP - INTERVAL '46 days 4 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-003'),   60.00, 'Shared subscription',        CURRENT_TIMESTAMP - INTERVAL '43 days 1 hour'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-005'),  100.00, 'Sports equipment',           CURRENT_TIMESTAMP - INTERVAL '40 days 6 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'), (SELECT account_id FROM accounts WHERE account_number = 'FV-USER-006'),   75.00, 'Art supplies payment',       CURRENT_TIMESTAMP - INTERVAL '37 days 3 hours'),
((SELECT account_id FROM accounts WHERE account_number = 'FV-USER-010'), (SELECT account_id FROM accounts WHERE account_number = 'FV-ADMIN-001'),  50.00, 'Donation',                   CURRENT_TIMESTAMP - INTERVAL '12 days 1 hour');

-- Seed Vulnerability Toggles
-- Default to FALSE (hardened mode) per per-user toggle architecture
-- module_key = OWASP category ID, module_name = code-facing short name
-- See references/OWASP_Module_Mapping.md for full mapping details
INSERT INTO vulnerability_settings (module_key, module_name, is_vulnerable)
VALUES
('a01-broken-access-control',   'bola',                   FALSE),
('a02-cryptographic-failures',  'weak_password_storage',  FALSE),
('a03-injection-sql',           'sql_injection',           FALSE),
('a03-xss-stored',              'xss_stored',              FALSE),
('a03-xss-reflected',           'xss_reflected',           FALSE),
('a05-security-misconfiguration','verbose_errors',          FALSE),
('a07-auth-failures',           'weak_session_tokens',     FALSE),
('a07-brute-force',             'brute_force',             FALSE),
('api3-excessive-data-exposure','excessive_data_exposure',  FALSE),
('api5-broken-function-auth',   'privilege_escalation',    FALSE);

-- Re-enable RLS once seeding is complete
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
