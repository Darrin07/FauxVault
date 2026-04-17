const crypto = require('node:crypto');

let accounts = [];


function generateAccountNumber(){
    return 'FAUX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}


function createAccount(userId, initialBalance = 0){
    const account = {
        id: crypto.randomUUID(),
        userId,
        balance: initialBalance,
        accountNumber: generateAccountNumber(),
        createdAt: new Date().toISOString(),
    };

    accounts.push(account);
    return account;
}

function resetAccounts(){
    accounts = [];
    transactions = [];
}

function findAccountByUserId(userId){
    return null;
}

function findAccountById(id){
    return null;
}


function getBalance(accountId){
    return null
}

// function transfer

module.exports = {
    createAccount, 
    resetAccounts,

    // findAccountByUserId,
    // findAccountById,
    // getBalance,
    // transfer,
    // getTransactions,
}