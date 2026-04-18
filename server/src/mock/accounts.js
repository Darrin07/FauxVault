/** in memory account store - placeholder until postgressql is connected */
const crypto = require('node:crypto');

let accounts = [];

/**
 * generates a random account number in FAUX-xxxxxxxx format
 * @returns {string} the generated account number
 */
function generateAccountNumber(){
    return 'FAUX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Creates a new bank account for a user with an initial balance
 * @param {string} userId - the owning user's ID
 * @param {number} initialBalance=0 - starting balance in dollars
 * @returns {Object} the created account record
 * @requirement R1.1
 */
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

/**
 * clears all accounts from the store. used in test teardown.
 */
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