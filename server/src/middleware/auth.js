/** JWT auth middleware for protected routes */
const jwt = require('jsonwebtoken');
const config = require('../config');





/**
 * Verifies the bearer JWT and attaches decoded payload to req.user.
 * @param {Request} req - express request with Authorization header
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 * @throws {401} no token provided or token invalid/expired
 * @requirement R1.4
 */
function authenticate(req, res, next){
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({
            error: { status: 401, message: 'no token provided', code: 'AUTH_REQUIRED' },
        });
    }

    const token = authHeader.split(' ')[1];

    try{
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        next();
    } catch (err){
        return res.status(401).json({
            error: { status: 401, message: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        });
    }
}

module.exports = { authenticate };