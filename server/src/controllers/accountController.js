/** Account Controller - account lookup and balance handlers */
const {
    findAccountByUserId,
    findAccountById,
    findAccountOwner,
    getDepositSummary,
    getWithdrawalSummary,
} = require('../models/accounts');
const { executeSecurely } = require('../config/db');
const { findUserById, updateUser, updateUserRole } = require('../models/users');

/**
 * Returns the authenticated user's account info and balance.
 * Resolves the account from the JWT userId claim.
 * @param {Request} req - express request (req.user set by auth middleware)
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 * @returns {Object} account record with balance
 * @throws {404} no account found for the authenticated user
 * @requirement R1.2.2
 */
async function getMyAccount(req, res, next) {
    try {
        const accounts = await executeSecurely(req.user.userId, async (client) => {
            // RLS only applies if the read uses the same client that holds the
            // request's app.current_user_id session value.
            return findAccountByUserId(req.user.userId, client);
        });

        if (!accounts.length) {
            return res.status(404).json({
                error: { status: 404, message: 'No account found for authenticated user', code: 'ACCOUNT_NOT_FOUND' },
            });
        }

        const account = accounts[0];

        if (req.vuln_excessive_data_exposure) {
            // VULNERABLE: API3:2023 - Excessive Data Exposure
            // Returns all fields including sensitive internal data
            const user = await findUserById(req.user.userId);
            return res.json({
                account: {
                    id: account.id,
                    userId: account.userId,
                    accountNumber: account.accountNumber,
                    balance: account.balance,
                    accountType: account.accountType,
                    createdAt: account.createdAt,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        passwordBcrypt: user.passwordBcrypt,
                        role: user.role,
                        createdAt: user.createdAt,
                    },
                },
            });
        }

        // HARDENED MODE only return what the client needs
        res.json({
            account: {
                id: account.id,
                accountNumber: account.accountNumber,
                balance: account.balance,
                accountType: account.accountType,
                createdAt: account.createdAt,
            },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Updates the authenticated user's account.
 * In vulnerable mode accepts any field including isAdmin (mass assignment).
 * In hardened mode ignores sensitive fields.
 * @param {Request} req - express request with body fields
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 * @returns {Object} updated user record
 * @requirement R2.1.3
 */
async function updateMyAccount(req, res, next) {
    try {
        const user = await findUserById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                error: { status: 404, message: 'User not found', code: 'USER_NOT_FOUND' },
            });
        }

        if (req.vuln_excessive_data_exposure) {
            // VULNERABLE: API3:2023 - Mass Assignment
            // Accepts isAdmin field and promotes user to admin role
            if (req.body.isAdmin === true) {
                await updateUserRole(req.user.userId, 'admin');
                return res.json({
                    message: 'Account updated',
                    user: { ...user, role: 'admin' },
                });
            }
        }

        // HARDENED MODE - persist whitelisted fields only (name, email)
        const updated = await updateUser(req.user.userId, {
            name: req.body.name,
            email: req.body.email,
        });

        res.json({
            message: 'Account updated',
            user: {
                id: updated.id,
                username: updated.username,
                email: updated.email,
                name: updated.name,
            },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Returns an account by its ID. Hardened mode binds the RLS session to the
 * authenticated user, so cross-user reads return 404 (RLS hides the row).
 * Vulnerable mode (BOLA, A01 / API1) derives the RLS identity from the
 * requested account itself, which lets the requester read any account.
 * @param {Request} req - express request with :id param
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 * @returns {Object} account record
 * @throws {404} account not found
 * @requirement R1.2.2
 */
async function getAccountById(req, res, next) {
    try {
        if (req.vuln_bola) {
            // VULNERABLE: A01:2025 / API1:2023 - Broken Object Level Authorization
            // The session identity (req.user.userId) is ignored. We look up the
            // account's owner via the shared pool (no RLS context), then bind
            // RLS to that owner so the read succeeds for any account ID. This
            // mimics the common real-world bug where authorization is derived
            // from request data instead of the session.
            const ownerId = await findAccountOwner(req.params.id);

            if (!ownerId) {
                return res.status(404).json({
                    error: { status: 404, message: 'Account not found', code: 'ACCOUNT_NOT_FOUND' },
                });
            }

            const account = await executeSecurely(ownerId, async (client) => {
                return findAccountById(req.params.id, client);
            });

            if (!account) {
                // findAccountOwner saw a row but the RLS-scoped read did not.
                // Account was deleted between the two queries, or the owner
                // lookup was stale. Treat as 404 rather than crash on null.
                return res.status(404).json({
                    error: { status: 404, message: 'Account not found', code: 'ACCOUNT_NOT_FOUND' },
                });
            }

            return res.json({
                account: {
                    id: account.id,
                    accountNumber: account.accountNumber,
                    balance: account.balance,
                    accountType: account.accountType,
                    createdAt: account.createdAt,
                    ownerId: account.userId,
                    vulnerableMode: true,
                },
            });
        }

        // HARDENED: explicit application-layer ownership check. The RLS
        // session is bound to the requesting user, but RLS alone cannot be
        // trusted as the only barrier (e.g. a superuser DB role bypasses
        // policies). Comparing account.userId to req.user.userId is the
        // direct BOLA mitigation and the teaching point of this module.
        const account = await executeSecurely(req.user.userId, async (client) => {
            return findAccountById(req.params.id, client);
        });

        if (!account || account.userId !== req.user.userId) {
            return res.status(404).json({
                error: { status: 404, message: 'Account not found', code: 'ACCOUNT_NOT_FOUND' },
            });
        }

        res.json({
            account: {
                id: account.id,
                accountNumber: account.accountNumber,
                balance: account.balance,
                accountType: account.accountType,
                createdAt: account.createdAt,
            },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Returns deposit summary (incoming transfers) for the current month.
 * @param {Request} req - express request (req.user set by auth middleware)
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 */
async function getDeposits(req, res, next) {
    try {
        const response = await executeSecurely(req.user.userId, async (client) => {
            // Both the account lookup and the summary query touch RLS-protected
            // tables, so they have to remain on this same client from start to
            // finish.
            const accounts = await findAccountByUserId(req.user.userId, client);

            if (!accounts.length) {
                return res.status(404).json({
                    error: { status: 404, message: 'No account found for authenticated user', code: 'ACCOUNT_NOT_FOUND' },
                });
            }

            const total = await getDepositSummary(accounts[0].id, client);
            return res.json({ total, period: 'this month' });
        });

        return response;
    } catch (err) {
        next(err);
    }
}

/**
 * Returns withdrawal summary (outgoing transfers) for the current month.
 * @param {Request} req - express request (req.user set by auth middleware)
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 */
async function getWithdrawals(req, res, next) {
    try {
        const response = await executeSecurely(req.user.userId, async (client) => {
            // Same reasoning as getDeposits(...): once RLS is on, the full
            // request path has to share the same client/session context.
            const accounts = await findAccountByUserId(req.user.userId, client);

            if (!accounts.length) {
                return res.status(404).json({
                    error: { status: 404, message: 'No account found for authenticated user', code: 'ACCOUNT_NOT_FOUND' },
                });
            }

            const total = await getWithdrawalSummary(accounts[0].id, client);
            return res.json({ total, period: 'this month' });
        });

        return response;
    } catch (err) {
        next(err);
    }
}

module.exports = { getMyAccount, getAccountById, updateMyAccount, getDeposits, getWithdrawals };
