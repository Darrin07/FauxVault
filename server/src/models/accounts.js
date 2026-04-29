/** Account & transaction model — PostgreSQL queries replacing the in-memory mock store */
const { pool } = require('../config/db');

/**
 * Generates a random account number in FAUX-xxxxxxxx format.
 * @returns {string} the generated account number
 */
function generateAccountNumber() {
  return 'FAUX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Creates a new bank account for a user with an initial balance.
 * @param {string} userId - the owning user's UUID
 * @param {number} initialBalance - starting balance in dollars (default 0)
 * @returns {Object} the created account record
 */
async function createAccount(userId, initialBalance = 0) {
  const accountNumber = generateAccountNumber();
  const result = await pool.query(
    `INSERT INTO accounts (user_id, account_number, balance)
     VALUES ($1, $2, $3)
     RETURNING account_id AS id, user_id AS "userId", account_number AS "accountNumber", balance, created_at AS "createdAt"`,
    [userId, accountNumber, initialBalance]
  );
  const row = result.rows[0];
  row.balance = parseFloat(row.balance);
  return row;
}

/**
 * Finds all accounts belonging to a user.
 * @param {string} userId - the owning user's UUID
 * @returns {Array<Object>} array of account records (empty if none found)
 */
async function findAccountByUserId(userId) {
  const result = await pool.query(
    `SELECT account_id AS id, user_id AS "userId", account_number AS "accountNumber", balance, created_at AS "createdAt"
     FROM accounts WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map(row => ({ ...row, balance: parseFloat(row.balance) }));
}

/**
 * Finds a single account by its unique ID.
 * @param {string} id - the account's UUID
 * @returns {Object|undefined} the account record, or undefined if not found
 */
async function findAccountById(id) {
  const result = await pool.query(
    `SELECT account_id AS id, user_id AS "userId", account_number AS "accountNumber", balance, created_at AS "createdAt"
     FROM accounts WHERE account_id = $1`,
    [id]
  );
  const row = result.rows[0];
  if (row) row.balance = parseFloat(row.balance);
  return row;
}

/**
 * Returns the current balance for an account.
 * @param {string} accountId - the account's UUID
 * @returns {number|null} balance in dollars, or null if account not found
 */
async function getBalance(accountId) {
  const result = await pool.query(
    'SELECT balance FROM accounts WHERE account_id = $1',
    [accountId]
  );
  return result.rows[0] ? parseFloat(result.rows[0].balance) : null;
}

/**
 * Normalizes a transaction row from PostgreSQL into the API response shape.
 * Exposes both reference and memo during the XSS module rollout.
 * @param {Object} row - raw PostgreSQL transaction row
 * @returns {Object} normalized transaction record
 */
function normalizeTransaction(row) {
  return {
    ...row,
    amount: parseFloat(row.amount),
    memo: row.reference,
  };
}

/**
 * Transfer funds between accounts within a transaction.
 * Validates both accounts exist and that the sender has sufficient balance.
 * @param {string} fromAccountId - source account UUID
 * @param {string} toAccountId - destination account UUID
 * @param {number} amount - transfer amount in dollars (must be positive)
 * @param {string|null} reference - optional free-text transfer note
 * @returns {Object} the created transaction record
 * @throws {Error} if either account is not found or balance is insufficient
 */
async function transfer(fromAccountId, toAccountId, amount, reference = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fromResult = await client.query(
      'SELECT account_id, balance FROM accounts WHERE account_id = $1 FOR UPDATE',
      [fromAccountId]
    );
    if (!fromResult.rows[0]) {
      throw new Error('Source account not found');
    }

    const toResult = await client.query(
      'SELECT account_id FROM accounts WHERE account_id = $1 FOR UPDATE',
      [toAccountId]
    );
    if (!toResult.rows[0]) {
      throw new Error('Destination account not found');
    }

    const currentBalance = parseFloat(fromResult.rows[0].balance);
    if (currentBalance < amount) {
      throw new Error('Insufficient funds');
    }

    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE account_id = $2',
      [amount, fromAccountId]
    );
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE account_id = $2',
      [amount, toAccountId]
    );

    const txResult = await client.query(
      `INSERT INTO transactions (sender_account_id, receiver_account_id, amount, reference)
       VALUES ($1, $2, $3, $4)
       RETURNING transaction_id AS id, sender_account_id AS "fromAccountId", receiver_account_id AS "toAccountId", amount, reference, transaction_date AS "createdAt"`,
      [fromAccountId, toAccountId, amount, reference]
    );

    await client.query('COMMIT');
    return normalizeTransaction(txResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Returns all transactions involving a given account (as sender or receiver).
 * @param {string} accountId - the account's UUID
 * @returns {Array<Object>} array of transaction records (empty if none found)
 */
async function getTransactions(accountId) {
  const result = await pool.query(
    `SELECT transaction_id AS id, sender_account_id AS "fromAccountId", receiver_account_id AS "toAccountId", amount, reference, transaction_date AS "createdAt"
     FROM transactions
     WHERE sender_account_id = $1 OR receiver_account_id = $1
     ORDER BY transaction_date DESC`,
    [accountId]
  );
  return result.rows.map(normalizeTransaction);
}

/**
 * Returns the total deposits (incoming transfers) for an account in the current month.
 * @param {string} accountId - the account's UUID
 * @returns {number} total deposit amount
 */
async function getDepositSummary(accountId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE receiver_account_id = $1
       AND transaction_date >= date_trunc('month', CURRENT_DATE)`,
    [accountId]
  );
  return parseFloat(result.rows[0].total);
}

/**
 * Returns the total withdrawals (outgoing transfers) for an account in the current month.
 * @param {string} accountId - the account's UUID
 * @returns {number} total withdrawal amount
 */
async function getWithdrawalSummary(accountId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE sender_account_id = $1
       AND transaction_date >= date_trunc('month', CURRENT_DATE)`,
    [accountId]
  );
  return parseFloat(result.rows[0].total);
}

/**
 * Clears all accounts and transactions. Used in test teardown.
 */
async function resetAccounts() {
  await pool.query('TRUNCATE accounts CASCADE');
}

module.exports = {
  createAccount,
  resetAccounts,
  findAccountByUserId,
  findAccountById,
  getBalance,
  transfer,
  getTransactions,
  getDepositSummary,
  getWithdrawalSummary,
};
