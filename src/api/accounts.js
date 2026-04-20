// AI Notification:  Claude Code created a mock API for testing purposes for the Front End.  While I have generally verified routes could
//be reasonable, this will not be our real API and these files will be removed in the larger project.  By creating a mock API for me, 
//Claude has reasonably saved me 10-15 hours of time on a set of files we will not use in the future.

import { mockDelay } from './client'

/**
 * GET /api/accounts/balance
 */
export async function getBalance() {
    await mockDelay()
    return {
        balance: 12480.0,
        accountType: 'Checking',
        lastUpdated: new Date().toISOString(),
    }
}

/**
 * GET /api/accounts/deposits
 */
export async function getDeposits() {
    await mockDelay()
    return {
        total: 4200.0,
        period: 'this month',
    }
}

/**
 * GET /api/accounts/withdrawals
 */
export async function getWithdrawals() {
    await mockDelay()
    return {
        total: 1320.0,
        period: 'this month',
    }
}
