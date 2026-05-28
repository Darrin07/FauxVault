/** Transfer Controller - handles fund transfer requests */
const {
  findAccountByUserId,
  transfer,
  getTransactions,
  searchTransactions,
  normalizeTransaction,
} = require('../models/accounts');
const { executeSecurely } = require('../config/db');
const { restrictedPool } = require('../config/restrictedDb');

/** Resolves the caller's first account id via a parameterized lookup on the
 *  app role pool. The vulnerable SQLi branch uses this id directly in a
 *  string-concatenated SQL run on the restricted pool. Lookup is intentionally
 *  parameterized so the demo's injection surface is the memo search, not the
 *  account lookup. */
async function resolveCallerAccountId(userId) {
  return executeSecurely(userId, async (client) => {
    const accounts = await findAccountByUserId(userId, client);
    return accounts.length ? accounts[0].id : null;
  });
}

/**
 * Transfers funds from the authenticated user's account to a destination account.
 * Validates input, resolves the sender's account from their JWT claims,
 * and delegates to the data models.
 * @param {Request} req - express request with toAccountId and amount in body
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 * @returns {Object} the created transaction record
 * @throws {400} missing or invalid fields
 * @throws {404} sender has no account or destination not found
 * @throws {422} insufficient funds
 * @requirement R1.2.2
 */
// VULN MODULE: Stored XSS (A05) — add memo/reference field; toggle sanitization on output
async function createTransfer(req, res, next){
    try{
        const{ toAccountId, amount, memo, reference } = req.body;
        const transferReference = memo ?? reference ?? null;

        // --- input validation ---

        if(!toAccountId || amount === undefined){
            return res.status(400).json({
                error: { status: 400, message: 'toAccountId and amount are required', code: 'VALIDATION_FAILED'},
            });
        }
       
        // Vulnerability Module: Reflected XSS (A05) - UUID format validation
        // Hardened: generic error reveals nothing about submitted value
        // Vulnerable: raw toAccountId echoced in error message (the server-side reflection)
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(toAccountId)) {
            const message = req.vuln_xss_reflected
                ? `toAccountId "${toAccountId}" is not a valid account ID`
                : 'toAccountId must be a valid account ID';
            return res.status(400).json({
                error: { status: 400, message, code: 'VALIDATION_FAILED' },
            });
        }

        if(typeof amount !== 'number' || amount <= 0){
            return res.status(400).json({
                error: { status: 400, message: 'Amount must be a positive number', code: 'VALIDATION_FAILED'},
            });
        }

        if(transferReference !== null && typeof transferReference !== 'string'){
            return res.status(400).json({
                error: { status: 400, message: 'memo/reference must be a string', code: 'VALIDATION_FAILED'},
            });
        }

        // --- resolve sender account from JWT user ---

        const response = await executeSecurely(req.user.userId, async (client) => {
            // The sender lookup and the transfer transaction must share the same
            // client so RLS sees the authenticated user's session context.
            const senderAccounts = await findAccountByUserId(req.user.userId, client);
            if(!senderAccounts.length){
                return res.status(404).json({
                    error: { status: 404, message: 'No account found for auth user', code: 'ACCOUNT_NOT_FOUND'},
                });
            }

            const fromAccountId = senderAccounts[0].id;

            // --- execute transfer ---

            const transaction = await transfer(fromAccountId, toAccountId, amount, transferReference, client);
            return res.status(201).json({ transaction });
        });

        return response;

    } catch(err){
      if(err.message === 'Destination account not found'){
        return res.status(404).json({
            error: { status: 404, message: err.message, code: 'ACCOUNT_NOT_FOUND'},
        });
      }  
      if(err.message === 'Insufficient funds'){
        return res.status(422).json({
            error: { status: 422, message: err.message, code: 'INSUFFICIENT_FUNDS'},
        });
      }
      next(err);
    }
}

/**
 * Returns transaction history for the authenticated user's account.
 * Supports optional ?type=sent|received filter.
 * @param {Request} req - express request (req.user set by auth middleware)
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 * @returns {Array<Object>} array of transaction records
 * @throws {404} no account found for the authenticated user
 * @requirement R1.2.2
 */
async function getTransferHistory(req, res, next) {
    try {
        const { type, memo } = req.query;

        if (req.vuln_sql_injection === true) {
            // VULNERABLE: A03:2025 Injection (SQL) -- string concatenation
            // Toggle: a03-injection-sql
            const accountId = await resolveCallerAccountId(req.user.userId);
            if (!accountId) {
                return res.status(404).json({
                    error: { status: 404, message: 'No account found for auth user', code: 'ACCOUNT_NOT_FOUND' },
                });
            }

            const memoFragment = memo ?? '';
            // ORDER BY uses the alias "createdAt" so UNION-based payloads work cleanly
            // -- the union result keeps the alias as its column label, while the raw
            // column name `transaction_date` would not exist on the UNIONed output.
            const sql = `
                SELECT transaction_id AS id,
                       sender_account_id AS "fromAccountId",
                       receiver_account_id AS "toAccountId",
                       amount, reference,
                       transaction_date AS "createdAt"
                FROM transactions
                WHERE (sender_account_id = '${accountId}' OR receiver_account_id = '${accountId}')
                  AND reference ILIKE '%${memoFragment}%'
                ORDER BY "createdAt" DESC
                LIMIT 50
            `;

            try {
                const result = await restrictedPool.query(sql);
                return res.json({
                    transactions: result.rows.map(normalizeTransaction),
                    vulnerableMode: true,
                });
            } catch (err) {
                if (req.vuln_verbose_errors === true) {
                    // VULNERABLE: A05:2025 Security Misconfiguration -- verbose errors
                    // Composes with sql_injection per the C2 design (per-user toggle).
                    // Inline because the global errorHandler reads the global verbose_errors
                    // setting, not per-user.
                    return res.status(500).json({
                        error: {
                            status: 500,
                            message: err.message,
                            code: err.code || 'INTERNAL_ERROR',
                            stack: err.stack,
                            detail: err.detail || null,
                            hint: err.hint || null,
                        },
                    });
                }
                return res.status(500).json({
                    error: { status: 500, message: 'Search failed', code: 'SEARCH_FAILED' },
                });
            }
        }

        const response = await executeSecurely(req.user.userId, async (client) => {
            // History is also RLS-sensitive because it reads both the user's
            // account row and transaction rows. Keeping both reads on the same
            // client ensures PostgreSQL evaluates them under one user context.
            const senderAccounts = await findAccountByUserId(req.user.userId, client);
            if (!senderAccounts.length) {
                return res.status(404).json({
                    error: { status: 404, message: 'No account found for auth user', code: 'ACCOUNT_NOT_FOUND' },
                });
            }

            const accountId = senderAccounts[0].id;

            let history = memo
                ? await searchTransactions(accountId, memo, client)
                : await getTransactions(accountId, client);

            if (type === 'sent') {
                history = history.filter(t => t.fromAccountId === accountId);
            } else if (type === 'received') {
                history = history.filter(t => t.toAccountId === accountId);
            }

            return res.json({ transactions: history });
        });

        return response;
    } catch (err) {
        next(err);
    }
}

module.exports = { createTransfer, getTransferHistory };
