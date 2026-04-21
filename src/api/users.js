import { mockDelay } from './client'

/**
 * GET /api/users/profile
 */
export async function getProfile() {
    await mockDelay()
    return {
        id: 1,
        username: 'jdoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        accountNumber: '00142',
        address: '123 Main St, Anytown, USA 12345',
    }
}

/**
 * PUT /api/users/profile
 */
export async function updateProfile(data) {
    await mockDelay()
    /* In a real app this would persist. For now, echo back merged data. */
    return {
        id: 1,
        username: 'cardib',
        accountNumber: '00142',
        ...data,
    }
}
