/** Auth Controller - registration, login and logout handlers */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { createUser, findUserByEmail, findUserByEmailAllHashes, findUserByUsername, findUserByUsernameAllHashes } = require('../models/users');
const { createAccount } = require('../models/accounts');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Creates a signed JWT with user claims.
 * Used by both register and login flow.
 * @param {Object} user - the user record
 * @returns {string} signed JWT token
 * @requirement R1.1
*/
function generateToken(user){
    return jwt.sign(
        {userId: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
}

/**
    * Strips sensitive fields before sending user data to the client
    * @param {Object} user - the full user record
    * @returns {Object} user object without password fields
 */
function sanitizeUser(user){
    return { id: user.id, username: user.username, email: user.email, role: user.role };
}

/**
    * Registers a new user.
    * VULN MODULE: weak_password_storage (A02/A04)
    *   Vulnerable:  stores password_plaintext + password_md5; response includes hashInfo
    *   Hardened:    stores only password_bcrypt; plaintext/md5 columns set to NULL
    * @param {Request} req - express request with username, email, password in body
    * @param {Response} res - express response
    * @param {function} next - express next middleware
    * @returns {Object} JWT token, sanitized user object, and (vulnerable only) hashInfo
    * @throws {400} missing required fields
    * @throws {409} email or username already registered
    * @requirement R1.1, R2.3.1
 */
async function register(req, res, next){
    try{
        const { username, email, password } = req.body;

        if(!username || !email || !password){
            return res.status(400).json({
                error: { status: 400, message: 'Username, email, and password are required', code: 'VALIDATION_FAILED' },
            });
        }

        if(await findUserByEmail(email)){
            return res.status(409).json({
                error: { status: 409, message: 'Email already registered', code: 'EMAIL_EXISTS' },
            });
        }

        if(await findUserByUsername(username)){
            return res.status(409).json({
                error: { status: 409, message: 'Username already taken', code: 'USERNAME_EXISTS' },
            });
        }

        const passwordBcrypt = await bcrypt.hash(password, config.bcryptSaltRounds);

        let userFields;
        let hashInfo;

        if (req.vuln_weak_password_storage) {
            // VULN MODULE: weak_password_storage — store plaintext and MD5 alongside bcrypt
            const passwordMd5 = md5(password);
            userFields = { username, email, passwordBcrypt, passwordPlaintext: password, passwordMd5, role: 'user' };
            hashInfo = {
                vulnerableMode: true,
                storedFormats: ['plaintext', 'md5', 'bcrypt'],
                plaintext: password,
                md5: passwordMd5,
                bcrypt: passwordBcrypt,
            };
        } else {
            // Hardened — bcrypt only; clear any previously stored weak hashes
            userFields = { username, email, passwordBcrypt, passwordPlaintext: null, passwordMd5: null, role: 'user' };
        }

        const user = await createUser(userFields);
        await createAccount(user.id, 1000);

        const token = generateToken(user);
        const body = { token, user: sanitizeUser(user) };
        if (hashInfo) body.hashInfo = hashInfo;

        res.status(201).json(body);
    } catch (err) {
        next(err);
    }
}

/**
 * Authenticates a user and returns a JWT.
 * VULN MODULE: weak_password_storage (A02/A04)
 *   Vulnerable:  compares submitted password against stored MD5 hash; response includes hashInfo
 *   Hardened:    compares against bcrypt hash
 * Accepts email or username as identifier.
 * @param {Request} req - express request with identifier, password in body
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 * @returns {Object} JWT token, sanitized user object, and (vulnerable only) hashInfo
 * @throws {400} missing required fields
 * @throws {401} invalid credentials
 * @requirement R1.1, R4.2.1, R4.2.2
 */
async function login(req, res, next){
    try{
        const { identifier, password } = req.body;

        if(!identifier || !password) {
            return res.status(400).json({
                error: { status: 400, message: 'Identifier and password are required', code: 'VALIDATION_FAILED' },
            });
        }

        const byEmail = identifier.includes('@');

        let user;
        let valid;
        let hashInfo;

        if (req.vuln_weak_password_storage) {
            // VULN MODULE: weak_password_storage — look up all hash columns, compare via MD5
            user = byEmail
                ? await findUserByEmailAllHashes(identifier)
                : await findUserByUsernameAllHashes(identifier);

            if (!user) {
                return res.status(401).json({
                    error: { status: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
                });
            }

            const submittedMd5 = md5(password);
            valid = submittedMd5 === user.passwordMd5;
            hashInfo = {
                vulnerableMode: true,
                comparisonMethod: 'md5',
                submittedMd5,
                storedMd5: user.passwordMd5,
                storedPlaintext: user.passwordPlaintext,
            };
        } else {
            user = byEmail
                ? await findUserByEmail(identifier)
                : await findUserByUsername(identifier);

            if (!user) {
                return res.status(401).json({
                    error: { status: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
                });
            }

            valid = await bcrypt.compare(password, user.passwordBcrypt);
        }

        if(!valid){
            return res.status(401).json({
                error: { status: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
            });
        }

        const token = generateToken(user);
        const body = { token, user: sanitizeUser(user) };
        if (hashInfo) body.hashInfo = hashInfo;

        res.json(body);
    } catch (err) {
        next(err);
    }
}


/**
 * Logs out the current user (stateless — client discards token)
 * @param {Request} req - express request
 * @param {Response} res - express response
 * @requirement R1.1
 */
function logout(req, res) {
    res.json({ message: 'Logged out'});
}

module.exports = { register, login, logout };
