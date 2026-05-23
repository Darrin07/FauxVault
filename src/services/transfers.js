import { apiFetch } from './client'

/**
* Transfers service: POST /transfers and GET /transfers
* Work with: server - transferController.js
*   POST /transfers   body: { toAccountId, amount, memo? }
*                     → { transaction: { id, fromAccountId, toAccountId, amount, reference, memo, createdAt } }
*   GET  /transfers   query: ?type=sent|received (optional)
*                     → { transactions: [ { id, fromAccountId, toAccountId, amount, reference, memo, createdAt } ] }
*
*  NOTE: The server stores the note as `reference` (DB column name) and aliases it as `memo` on the
*        response. Both fields are present and carry the same value. The frontend normalize.js reads
*        `memo ?? reference` so either name in the payload resolves correctly.
*  NOTE: Both require a Bearer JWT (injected automatically by apiFetch).
*/

//Note — possible server need: the server returns account IDs only, not recipient names.
//UI components should display toAccountId or a generic label rather than a name.


/**
 * POST /api/transfers
 * Function: Transfers funds to another account
 * @param {{ toAccountId: string, amount: number, memo?: string }} fields
 * @returns {{ transaction: { id, fromAccountId, toAccountId, amount, reference, createdAt } }}
 */

export async function sendTransfer({ toAccountId, amount, memo }) {
    return await apiFetch('/transfers', {
        method: 'POST',
        body: JSON.stringify({ toAccountId, amount, memo }),
    })
}

/**
 * GET /api/transfers
 * Function: Returns transaction history for the user
 * @param {'sent'|'received'|null} type
 * @returns {{ transactions: Array }}
 */

export async function getTransfers(type = null) {
    const query = type ? `?type=${type}` : ''
    return await apiFetch(`/transfers${query}`)
}
