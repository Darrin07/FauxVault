/** Account Controller - account lookup and balance handlers */
const {
    findAccountByUserId,
    findAccountById,
    getDepositSummary,
    getWithdrawalSummary,
} = require('../models/accounts');

// Import secure wrapper from db.js
const { executeSecurely } = require('../db');

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
        const accounts = await executeSecurely(req.user.userId, async () => {
            return await findAccountByUserId(req.user.userId);
        });

        if (!accounts.length) {
            return res.status(404).json({
                error: { status: 404, message: 'No account found for authenticated user', code: 'ACCOUNT_NOT_FOUND' },
            });
        }

        const account = accounts[0];
        res.json({
            account: {
                id: account.id,
                accountNumber: account.accountNumber,
                balance: account.balance,
                createdAt: account.createdAt,
            },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Returns an account by its ID. In hardened mode this will
 * verify ownership; in vulnerable mode (BOLA) it won't.
 * For now, returns the account without ownership check — the
 * vulnerability toggle will be layered on in PR#2.
 * @param {Request} req - express request with :id param
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 * @returns {Object} account record
 * @throws {404} account not found
 * @requirement R1.2.2
 */
async function getAccountById(req, res, next) {
    try {
        const account = await executeSecurely(req.user.userId, async () => {
            return await findAccountById(req.params.id);
        });

        if (!account) {
            return res.status(404).json({
                error: { status: 404, message: 'Account not found', code: 'ACCOUNT_NOT_FOUND' },
            });
        }

        res.json({
            account: {
                id: account.id,
                accountNumber: account.accountNumber,
                balance: account.balance,
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
        await executeSecurely(req.user.userId, async () => {
            const accounts = await findAccountByUserId(req.user.userId);

            if (!accounts.length) {
                return res.status(404).json({
                    error: { status: 404, message: 'No account found for authenticated user', code: 'ACCOUNT_NOT_FOUND' },
                });
            }

            const total = await getDepositSummary(accounts[0].id);
            res.json({ total, period: 'this month' });
        });
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
        await executeSecurely(req.user.userId, async () => {
            const accounts = await findAccountByUserId(req.user.userId);

            if (!accounts.length) {
                return res.status(404).json({
                    error: { status: 404, message: 'No account found for authenticated user', code: 'ACCOUNT_NOT_FOUND' },
                });
            }

            const total = await getWithdrawalSummary(accounts[0].id);
            res.json({ total, period: 'this month' });
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { getMyAccount, getAccountById, getDeposits, getWithdrawals };
