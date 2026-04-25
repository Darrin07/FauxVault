/** Auth Controller - registration, login and logout handlers */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { createUser, findUserByEmail, findUserByUsername } = require('../mock/users');
const { createAccount } = require('../mock/accounts');


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
    * @returns {Object} user object without passwordHash
 */
function sanitizeUser(user){
    return { id: user.id, username: user.username, email: user.email, role: user.role };
}

/**
    * Registers a new user with hashed creds and a default account.
    * Validates input, checks for duplicate emails and usernames,
    * and initializes a $1000 balance.
    * @param {Request} req - express request with username, email, password in body
    * @param {Response} res - express response
    * @param {function} next - express next middleware
    * @returns {Object} JWT token and sanitized user object
    * @throws {400} missing required fields
    * @throws {409} email or username already registered
    * @requirement R1.1
 */
async function register(req, res, next){
    try{
        const { username, email, password } = req.body;

        if(!username || !email || !password){
            return res.status(400).json({
                error: { status: 400, message: 'Username, email, and password are required', code: 'VALIDATION_FAILED' },
            });
        }

        if(findUserByEmail(email)){
            return res.status(409).json({
                error: { status: 409, message: 'Email already registered', code: 'EMAIL_EXISTS' },
            });
        }

        if(findUserByUsername(username)){
            return res.status(409).json({
                error: { status: 409, message: 'Username already taken', code: 'USERNAME_EXISTS' },
            });
        }

        const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
        const user = createUser({ username, email, passwordHash, role: 'user' });

        createAccount(user.id, 1000);

        const token = generateToken(user);
        res.status(201).json({ token, user: sanitizeUser(user) });
    } catch (err) {
        next(err);
    }
}

/**
 * Authenticates a user against stored bcrypt hash and returns a JWT.
 * Accepts email or username as the identifier — if it contains @,
 * looks up by email, otherwise by username.
 * @param {Request} req - express request with identifier, password in body
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 * @returns {Object} JWT token and sanitized user object
 * @throws {400} missing required fields
 * @throws {401} invalid credentials
 * @requirement R1.1
 */
async function login(req, res, next){
    try{
        const { identifier, password } = req.body;

        if(!identifier || !password) {
            return res.status(400).json({
                error: { status: 400, message: 'Identifier and password are required', code: 'VALIDATION_FAILED' },
            });
        }

        const user = identifier.includes('@')
            ? findUserByEmail(identifier)
            : findUserByUsername(identifier);

        if(!user){
            return res.status(401).json({
                error: { status: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
            });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if(!valid){
            return res.status(401).json({
                error: { status: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
            });
        }

        const token = generateToken(user);
        res.json({ token, user: sanitizeUser(user) });
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
