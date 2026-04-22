import { mockDelay } from './client'

/**
 * For Test:  GET /api/users/profile
 */
export async function getProfile() {
    await mockDelay()
    return {
        id: 1,
        username: 'scurry',
        firstName: 'Steph',
        lastName: 'Curry',
        email: 'steph.curry@email.com',
        accountNumber: 'FAUX-M3KQ8P1Z',
        address: '30 Main St, Oakland, USA 12345',
    }
}

/**
 * For Test:  PUT /api/users/profile
 */
export async function updateProfile(data) {
    await mockDelay()
    // will not use persistence for testing
    return {
        id: 1,
        username: 'scurry',
        accountNumber: 'FAUX-M3KQ8P1Z',
        ...data,
    }
}
