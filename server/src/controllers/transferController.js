/** Transfer Controller - handles fund transfer requests */
const { findAccountByUserId, transfer } = require('../mock/accounts');

/**
 * Transfers funds from the authenticated user's account to a destination account.
 * Validates input, resolves the sender's account from their JWT claims,
 * and delegates to the mock data layer.
 * @param {Request} req - express request with toAccountId and amount in body
 * @param {Response} res - express response
 * @param {Function} next - express next middleware
 * @returns {Object} the created transaction record
 * @throws {400} missing or invalid fields
 * @throws {404} sender has no account or destination not found
 * @throws {422} insufficient funds
 * @requirement R1.2.2
 */
async function createTransfer(req, res, next){
    try{
        const{ toAccountId, amount } = req.body;

        // --- input validation ---

        if(!toAccountId || amount === undefined){
            return res.status(400).json({
                error: { status: 400, message: 'toAccountId and amount are required', code: 'VALIDATION_FAILED'},
            });
        }
        
        if(typeof amount !== 'number' || amount <= 0){
            return res.status(400).json({
                error: { status: 400, message: 'Amount must be a positive number', code: 'VALIDATION_FAILED'},
            });
        }

        // --- resolve sender account from JWT user ---

        const senderAccounts = findAccountByUserId(req.user.userId);
        if(!senderAccounts.length){
            return res.status(404).json({
                error: { status: 404, message: 'No account found for auth user', code: 'ACCOUNT_NOT_FOUND'},
            });
        }

        const fromAccountId = senderAccounts[0].id;

        // --- execute transfer ---

        const transaction = transfer(fromAccountId, toAccountId, amount);
        res.status(201).json({ transaction });

    } catch(err){
      if(err.message === 'Destination account not found'){
        return res.status(404).json({
            error: { status: 404, message: err.message, code: 'ACCOUNT_NOT_FOUND'},
        });
      }  
      if(err.message === 'Insufficient funds'){
        return res.status(422).json({
            error: { status: 422, message: err.message, code: 'INSUFFICIENT_FUNDS'},
        });
      }
      next(err);
    }
}

module.exports = { createTransfer };