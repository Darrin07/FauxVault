/** Auth Controller - registration, login and logout handlers */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { createUser, findUserByEmail, findUserByEmailAllHashes, findUserById, findUserByUsername, findUserByUsernameAllHashes } = require('../models/users');
const { createAccount } = require('../models/accounts');

const isProduction = config.nodeEnv === 'production';
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hr, JWT expiresIn

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
    return { id: user.id, username: user.username, email: user.email, name: user.name || '', role: user.role };
}

/**
 * Sets the session token as a cookie with flags determined by the vulnerability module.
 * Vulnerability Module: weak_session_tokens (A07)
 *   Vulnerable:  httpOnly=false, secure=false, sameSite='Lax': JS-accessible
 *   Hardened:    httpOnly=true, secure=true (prod), sameSite='Strict': JS-inaccessible
 * @param {Response} res - express response object
 * @param {string} token - the signed JWT
 * @param {boolean} isVulnerable - whether the weak_session_tokens module is enabled
 */
function setSessionCookie(res, token, isVulnerable) {
    if (isVulnerable) {
        res.cookie('token', token, {
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
            maxAge: COOKIE_MAX_AGE,
            path: '/',
        });
    } else {
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'Strict',
            maxAge: COOKIE_MAX_AGE,
            path: '/',
        });
    }
}

/**
    * Registers a new user.
    * VULN MODULE: weak_password_storage (A02)
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
        const { name, username, email, password } = req.body;

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

        let userFields;
        let hashInfo;

        if (req.vuln_weak_password_storage) {
            // VULN MODULE: weak_password_storage — store plaintext and MD5 only; no bcrypt
            const passwordMd5 = md5(password);
            userFields = { name, username, email, passwordBcrypt: null, passwordPlaintext: password, passwordMd5, role: 'user' };
            hashInfo = {
                vulnerableMode: true,
                storedFormats: ['plaintext', 'md5'],
                plaintext: password,
                md5: passwordMd5,
            };
        } else {
            // Hardened — bcrypt only; no plaintext or MD5
            const passwordBcrypt = await bcrypt.hash(password, config.bcryptSaltRounds);
            userFields = { name, username, email, passwordBcrypt, passwordPlaintext: null, passwordMd5: null, role: 'user' };
        }

        const user = await createUser(userFields);
        await createAccount(user.id, 1000);

        const token = generateToken(user);

        //Vulnerability Module:  weak_session_tokens - set cookie with appropriate flags
        setSessionCookie(res, token, req.vuln_weak_session_tokens);

        const body = { user: sanitizeUser(user) };
        if (req.vuln_weak_session_tokens) body.token = token; //vulnerable: token in body
        if (hashInfo) body.hashInfo = hashInfo;

        res.status(201).json(body);
    } catch (err) {
        next(err);
    }
}

/**
 * Authenticates a user and returns a JWT.
 * VULN MODULE: weak_password_storage (A02)
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

            valid = user.passwordBcrypt
                ? await bcrypt.compare(password, user.passwordBcrypt)
                : false;
        }

        if(!valid){
            return res.status(401).json({
                error: { status: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
            });
        }

        const token = generateToken(user);

        //vulnerability module: weak_session_tokens - set cookie w/appropriate flags
        setSessionCookie(res, token, req.vuln_weak_session_tokens);
        const body = { user: sanitizeUser(user) };
        if (req.vuln_weak_session_tokens) body.token = token; //vulnerable: token in body as well
        if (hashInfo) body.hashInfo = hashInfo;

        res.json(body);
    } catch (err) {
        next(err);
    }
}


/**
 * Logs out the current user.
 * Clears the session cookie regardless of module state.
 * Client is responsbile for discarding localStorage token.
 * @param {Request} req - express request
 * @param {Response} res - express response
 * @requirement R1.1
 */
function logout(req, res) {
    res.clearCookie('token', { path: '/' });
    res.json({ message: 'Logged out'});
}

/**
 * Returns the current authenticated user.
 * Supports hardened weak_session_tokens mode by hydrating frontend auth state
 * from the HttpOnly session cookie.
 * @param {Request} req - express request with req.user set by authenticate
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 * @requirement R1.1
 */
async function me(req, res, next) {
    try {
        const user = await findUserById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                error: { status: 404, message: 'User not found', code: 'USER_NOT_FOUND' },
            });
        }

        res.json({ user: sanitizeUser(user) });
    } catch (err) {
        next(err);
    }
}

module.exports = { register, login, logout, me };
