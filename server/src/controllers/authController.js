const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { createUser, findUserByEmail } = require('../mock/users');
const { createAccount } = require('../mock/accounts');

function generateToken(user){
    return jwt.sign(
        {userId: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
}

function sanitizeUser(user){
    return{ id: user.id, email: user.email, name: user.name, role: user.role };
}


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


function logout(req, res) {
    res.json({ message: 'Logged out'});
}






module.exports = { register, login, logout };