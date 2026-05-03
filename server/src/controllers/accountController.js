/** Account Controller - account lookup and balance handlers */
const {
    findAccountByUserId,
    findAccountById,
    // getTransactions belongs in transfer history flows, not this controller.
    // Keep it commented here to preserve the earlier intent without failing lint.
    // getTransactions,
} = require('../models/accounts');
const { findUserById, updateUserRole } = require('../models/users');

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
        const accounts = await findAccountByUserId(req.user.userId);

        if (!accounts.length) {
            return res.status(404).json({
                error: { status: 404, message: 'No account found for authenticated user', code: 'ACCOUNT_NOT_FOUND' },
            });
        }

        const account = accounts[0];

        if (req.vulnerableMode) {
            // VULNERABLE MODE
            // A02 - Excessive Data Exposure
            // returns all fields including sensitive data
            const user = await findUserById(req.user.userId);
            return res.json({
                account: {
                    id: account.id,
                    userId: account.userId,
                    accountNumber: account.accountNumber,
                    balance: account.balance,
                    createdAt: account.createdAt,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        passwordHash: user.passwordHash,
                        role: user.role,
                        createdAt: user.createdAt,
                    },
                },
            });

        // HARDENED MODE - returns what client needs
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

/** Updates the authenticated user's account. 
 * In Vulnerable mode accepts any field including isAdmin
 * In hardened mode ignore sensitve fields.
 * @param {Request} req - express request with body fields
 * @param {Response} res = express response
 * @param {Function} next - express next middleware
 * @returns {Object} updated user record
 * @requirement R2.1.3
 */
async function updateMyAccount(req, res, next) {
    try{
        const user = await findUserById(req.user.userId);
        if (!user){
            return res.status(404).json({
                error: {status: 404, message: 'User not found', code: 'USER_NOT_FOUND'},
            });
        }
        if (req.vulnerableMode) {
            // VULNERABLE MODE
            // API3 - Mass Assignment
            // Accpets isAdmin diled and promotes user to admin role
            if (req.body.isAdmin === true) {
                await updateUserRole(req.user.userId, 'admin');
                return res.json({
                    message: 'Account updated',
                    user: { ...user, role: 'admin' },
                });
            }
        }

        //HARDENED MODE - ignore sensitive fields, returns safe response
        res.json({
            message: 'Account updated',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
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
        const account = await findAccountById(req.params.id);

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

module.exports = { getMyAccount, getAccountById, updateMyAccount };
