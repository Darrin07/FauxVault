/** in memory account store - placeholder until postgressql is connected */
const crypto = require('node:crypto');

let accounts = [];
let transactions = [];

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

/**
 * Finds all accounts belonging to a user
 * @param {string} userId - the owning user's ID
 * @returns {Array<Object>} array of account records (empty if none found)
 * @requirement R1.2.2 
*/
function findAccountByUserId(userId){
    return accounts.filter(a => a.userId === userId);
}

/**
 * Finds a single account by its unique ID
 * @param {string} id - the account's UUID 
 * @returns {Object|undefined} the account record, or undefined if not found 
 * @requirement R1.2.2
 */
function findAccountById(id){
    return accounts.find(a => a.id === id);
}


/**
 * Returns the current balance for an account
 * @param {string} accountId - the account's UUID 
 * @returns {number|null} balance in dollars, or null if account not found
 * @requirement R1.2.2
 */
function getBalance(accountId){
    const account = findAccountById(accountId);
    return account ? account.balance : null;
}

/**
 * Transfer funds between accounts. Validates both accounts exist
 * and that the sender has sufficient balance before executing
 * @param {string} fromAccountId - source account UUID
 * @param {string} toAccountId - destination account UUID
 * @param {number} amount - transfer amount in dollars (must be positive)
 * @returns {Object} the created transaction record
 * @throws {Error} if either account is not found or balance is insufficient
 * @requirement R1.2.2
 */
function transfer(fromAccountId, toAccountId, amount){
    const from = findAccountById(fromAccountId);
    if(!from){
        throw new Error('Source account not found');
    }

    const to = findAccountById(toAccountId);
    if(!to){
        throw new Error('Destination account not found');
    }

    if(from.balance < amount){
        throw new Error('Insufficient funds')
    }

    from.balance -= amount;
    to.balance += amount;

    const transaction ={
        id: crypto.randomUUID(),
        fromAccountId,
        toAccountId,
        amount,
        createdAt: new Date().toISOString(),
    };

    transactions.push(transaction);
    return transaction;
}

/**
 * Returns all transactions involving a given account (as sender or receiver)
 * @param {string} accountId - the account's UUID
 * @returns {Array<Object>} array of transaction records (empty if none found)
 * @requirement R1.2.2
 */
function getTransactions(accountId){
    return transactions.filter(
        t => t.fromAccountId === accountId || t.toAccountId === accountId
    );
}


module.exports = {
    createAccount, 
    resetAccounts,
    findAccountByUserId,
    findAccountById,
    getBalance,
    transfer,
    getTransactions,
}