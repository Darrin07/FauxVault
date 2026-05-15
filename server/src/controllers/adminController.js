// VULN MODULE: Privilege Escalation (API5-Broken Function Level Auth)
// These endpoints are admin-only in hardened mode. When privilege_escalation is
// enabled the requireRole middleware upstream lets any authenticated user through,
// giving a regular 'user' full visibility into — and control over — all accounts.

const { getAllUsers, findUserById, updateUserRole } = require('../models/users');

const VALID_ROLES = ['user', 'admin'];

/**
 * Lists every registered user. In hardened mode this is gated behind requireRole('admin')
 * In vulnerable mode any authenticated user can enumerate akk accounts
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 * @requirement R2.1.2
 */
async function listUsers(req, res, next) {
    try {
        const users = await getAllUsers();
        res.json({ users });
    } catch (err) {
        next(err);
    }
}

/**
 * Returns a single user by UUID. Exposes email, role, and account metadata that a regular user should never see.
 * @param {Request} req - req.params.id is the target user UUID
 * @param {Response} res
 * @param {Function} next
 * @requirement R2.1.2
 */
async function getUserById(req, res, next) {
    try {
        const user = await findUserById(req.params.id);

        if (!user) {
            return res.status(404).json({
                error: { status: 404, message: 'User not found', code: 'USER_NOT_FOUND' },
            });
        }

        res.json({ user });
    } catch (err) {
        next(err);
    }
}

/**
 * Promotes or demotes a user's role.
 * In hardened mode only admins reach this;
 * in vulnerable mode any authenticated user can change any other user's role
 * @param {Request} req - req.params.id target UUID; req.body.role new role string
 * @param {Response} res
 * @param {Function} next
 * @requirement R2.1.2
 */
async function changeUserRole(req, res, next) {
    try {
        const { role } = req.body;

        if (!role || !VALID_ROLES.includes(role)) {
            return res.status(400).json({
                error: {
                    status: 400,
                    message: `role must be one of: ${VALID_ROLES.join(', ')}`,
                    code: 'VALIDATION_FAILED',
                },
            });
        }

        const updated = await updateUserRole(req.params.id, role);

        if (!updated) {
            return res.status(404).json({
                error: { status: 404, message: 'User not found', code: 'USER_NOT_FOUND' },
            });
        }

        res.json({ user: updated });
    } catch (err) {
        next(err);
    }
}

module.exports = { listUsers, getUserById, changeUserRole };
