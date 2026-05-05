-- Restart
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_vulnerability_settings CASCADE;
DROP TABLE IF EXISTS vulnerability_settings CASCADE;

-- Users Table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) DEFAULT '',
    password_plaintext VARCHAR(255),
    password_md5 VARCHAR(32),
    password_bcrypt VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts Table
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    account_type VARCHAR(20) DEFAULT 'checking',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    receiver_account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    reference TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table
CREATE TABLE vulnerability_settings (
    module_key VARCHAR(50) PRIMARY KEY,
    module_name VARCHAR(50) UNIQUE NOT NULL,
    is_vulnerable BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_vulnerability_settings (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    module_name VARCHAR(50) NOT NULL REFERENCES vulnerability_settings(module_name) ON DELETE CASCADE,
    is_vulnerable BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, module_name)
);

-- Enable RLS on sensitive tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;

-- Create isolation policy for accounts
CREATE POLICY account_isolation_policy ON accounts
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', TRUE), '')::uuid
    );

-- Create isolation policy for transactions
-- A user sees a transaction if they own the sender OR receiver account
CREATE POLICY transaction_isolation_policy ON transactions
    USING (
        sender_account_id IN (SELECT account_id FROM accounts WHERE user_id = NULLIF(current_setting('app.current_user_id', TRUE), '')::uuid)
        OR 
        receiver_account_id IN (SELECT account_id FROM accounts WHERE user_id = NULLIF(current_setting('app.current_user_id', TRUE), '')::uuid)
    );
