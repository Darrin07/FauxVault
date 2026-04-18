/** Auth Controller - registration, login and logout handlers */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { createUser, findUserByEmail } = require('../mock/users');
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
    return{ id: user.id, email: user.email, name: user.name, role: user.role };
}

/**
    * Registers a new user with hashed creds and a default acccount.
    * Validates input, checks for duplicate emails, and initializes a $1000 balance 
    * @param {Request} req - express request with email, password, name in body 
    * @param {Response} res - express response
    * @param {function} next - express next middleware
    * @returns {Object} JWT token and sanitized user object
    * @throws {400} missing requirements fields
    * @throws {409} email already registered
    * @requirement R1.1
 */
async function register(req, res, next){
    try{
        const {  email, password, name } = req.body;

        if(!email || !password || !name){
            return res.status(400).json({
                error: { status: 400, message: 'Email, password, and name are required', code: 'VALIDATION_FAILED' },
            });
        }
        if(findUserByEmail(email)){
            return res.status(409).json({
                error: {status: 409, message: 'email already registered', code: 'EMAIL_EXISTS' },
            });
        }

        const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
        const user = createUser({ email, passwordHash, name, role: 'user' });

        createAccount(user.id, 1000);

        const token = generateToken(user);
        res.status(201).json({ token, user: sanitizeUser(user) });
    } catch (err) {
        next(err);
    }
}

/**
 * Authenticates a user aganst stored bcrypt hash and returns a JWT
 * @param {Request} req - express request with email, password in body
 * @param {Response} res - express response 
 * @param {Function} next - express next middleware
 * @returns {Object} JWT token and sanitized user object
 * @throws {400} missing required fields
 * @throws {401} invalid email or password
 * @requirement R1.1
 */
async function login(req, res, next){
    try{
        const { email, password } = req.body;

        if(!email || !password) {
            return res.status(400).json({
                error: { status: 400, message: 'Email and password are required', code: 'VALIDATION_FAILED' },
            });
        }

        const user = findUserByEmail(email);
        if(!user){
            return res.status(401).json({
                error: { status: 401, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
            });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if(!valid){
            return res.status(401).json({
                error: { status: 401, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
            });
        }

        const token = generateToken(user);
        res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
        next(err);
    }
}


/**
 * logs out the current user
 * @param {Request} req - express request
 * @param {Response} res - express response
 * @requirement R1.1
 */
function logout(req, res) {
    res.json({ message: 'Logged out'});
}






module.exports = { register, login, logout };