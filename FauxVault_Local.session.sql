-- 1. Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_plaintext VARCHAR(255), 
    password_md5 VARCHAR(32),
    password_bcrypt VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Accounts Table
CREATE TABLE accounts (
    account_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    account_type VARCHAR(20) DEFAULT 'checking'
);

-- 3. Transactions Table
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    sender_account_id INT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    receiver_account_id INT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    reference TEXT, 
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Settings Table
CREATE TABLE vulnerability_settings (
    module_key VARCHAR(50) PRIMARY KEY,
    is_vulnerable BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);