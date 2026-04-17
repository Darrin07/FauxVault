const crypto = require('node:crypto');

let users = [];

function createUser({ email, passwordHash, name, role }){
    const user = {
        id: crypto.randomUUID(),
        email,
        passwordHash,
        name,
        role: role || 'user',
        createdAt: new Date().toISOString(),
    };
    users.push(user);
    return user;
}

function findUserByEmail(email) {
    return users.find((u) => u.email === email) || null;
}


function findUserById(id){
    return users.find((u) => u.id === id) || null;
}

function resetUsers(){
    users = [];
}

module.exports = { createUser, findUserByEmail, findUserById, resetUsers };