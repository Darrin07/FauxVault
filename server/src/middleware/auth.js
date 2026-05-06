// VULN MODULE: Weak Session/Cookies (A07) — toggle cookie flags (httpOnly, secure, sameSite)
/** JWT auth middleware for protected routes */
const jwt = require('jsonwebtoken');
const config = require('../config');




/**
 * Verifies the bearer JWT and attaches decoded payload to req.user.
 * Checks Authorization header first and then falls back to cookie. 
 * Vulnerability Module: weak-session-tokens (A07): in hardened mode, token
 * is in an httpOnly cookie (no Authorization header from client)
 * @param {Request} req - express request with Authorization header
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 * @throws {401} no token provided or token invalid/expired
 * @requirement R1.4
 */
function authenticate(req, res, next){
    const authHeader = req.headers.authorization;
    let token;

    if(authHeader && authHeader.startsWith('Bearer ')){
        token = authHeader.split(' ')[1];
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if(!token){
        return res.status(401).json({
            error: { status: 401, message: 'No token provided', code: 'AUTH_REQUIRED' },
        });
    }

    try{
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        next();
    } catch (_err){
        return res.status(401).json({
            error: { status: 401, message: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        });
    }
}

module.exports = { authenticate };
