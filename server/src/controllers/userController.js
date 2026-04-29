/** User Controller - profile lookup and update handlers */
const { findUserById, updateUser, findUserByEmail } = require('../models/users');
const { findAccountByUserId } = require('../models/accounts');

/**
 * Returns profile info for the authenticated user, including account number.
 * @param {Request} req - express request (req.user set by auth middleware)
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 */
// VULN MODULE: Mass Assignment (API3) — toggle filtered vs all fields in response
async function getProfile(req, res, next) {
    try {
        const user = await findUserById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                error: { status: 404, message: 'User not found', code: 'USER_NOT_FOUND' },
            });
        }

        const accounts = await findAccountByUserId(user.id);
        const accountNumber = accounts.length ? accounts[0].accountNumber : null;

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role,
                accountNumber,
                createdAt: user.createdAt,
            },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Updates whitelisted profile fields for the authenticated user.
 * Hardened mode: only accepts name and email.
 * Mass Assignment module will later toggle this to accept any field.
 * @param {Request} req - express request with profile fields in body
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 */
// VULN MODULE: Mass Assignment (API3) — add vulnerable path that accepts any field including role
async function updateProfile(req, res, next) {
    try {
        const { name, email } = req.body;

        if (name === undefined && email === undefined) {
            return res.status(400).json({
                error: { status: 400, message: 'At least one field (name, email) is required', code: 'VALIDATION_FAILED' },
            });
        }

        if (email) {
            const existing = await findUserByEmail(email);
            if (existing && existing.id !== req.user.userId) {
                return res.status(409).json({
                    error: { status: 409, message: 'Email already registered', code: 'EMAIL_EXISTS' },
                });
            }
        }

        const updated = await updateUser(req.user.userId, { name, email });

        if (!updated) {
            return res.status(404).json({
                error: { status: 404, message: 'User not found', code: 'USER_NOT_FOUND' },
            });
        }

        const accounts = await findAccountByUserId(updated.id);
        const accountNumber = accounts.length ? accounts[0].accountNumber : null;

        res.json({
            user: {
                id: updated.id,
                username: updated.username,
                email: updated.email,
                name: updated.name,
                role: updated.role,
                accountNumber,
                createdAt: updated.createdAt,
            },
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { getProfile, updateProfile };
