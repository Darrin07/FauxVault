/**
 * Function: normalizeTransaction(transaction)
 * Adjusts the server's transaction shape to the shape the HistoryPage table uses
 *
 * Server shape:  { id, fromAccountId, toAccountId, amount, reference, memo, createdAt }
 * UI shape:      { id, date, description, type, amount }
 * @param {{ id: string, createdAt: string, memo?: string, reference?: string, amount: number }} txn
 * @returns {{ id: string, date: string, description: string, type: string, amount: number }}
 */
export function normalizeTransaction(txn) {
    return {
        id: txn.id,
        date: txn.createdAt,
        description: txn.memo || txn.reference || 'Transfer',
        type: 'transfer',
        amount: txn.amount,
    }
}
