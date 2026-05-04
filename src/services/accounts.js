import { apiFetch } from './client'

/**  Accounts service — GET /accounts/me, /accounts/deposits, /accounts/withdrawals
* Work with: server  - accountController.js:
*   GET /accounts/me           { account: { id, accountNumber, balance, createdAt } }
*   GET /accounts/deposits     { total: number, period: string }
*   GET /accounts/withdrawals  { total: number, period: string }
*  All three require a Bearer JWT (injected automatically by apiFetch).
*/

// Note — possible server need: the DB has an account_type column but the server does not
// currently return it from GET /accounts/me. I have written a default to 'Checking' until fixed.

/**
 * GET /api/accounts/me
 * Returns the authenticated user's account balance and info.
 * @returns {{ id, accountNumber, balance, accountType, lastUpdated }}
 */

export async function getBalance() {
    const data = await apiFetch('/accounts/me')

    const { account } = data
    return {
        id: account.id,
        accountNumber: account.accountNumber,
        balance: account.balance,
        accountType: account.accountType ?? 'Checking',
        lastUpdated: account.createdAt,
    }
}

/**
 * GET /api/accounts/deposits
 * Returns deposit total for the current month
 * @returns {{ total: number, period: string }}
 */
export async function getDeposits() {
    return await apiFetch('/accounts/deposits')
}

/**
 * GET /api/accounts/withdrawals
 * Returns withdrawal total for the current month
 * @returns {{ total: number, period: string }}
 */
export async function getWithdrawals() {
    return await apiFetch('/accounts/withdrawals')
}
