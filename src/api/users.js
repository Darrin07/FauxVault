import { mockDelay } from './client'

/**
 * For Test:  GET /api/users/profile
 */
export async function getProfile() {
    await mockDelay()
    return {
        id: 1,
<<<<<<< HEAD
        username: 'jdoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        accountNumber: 'FAUX-M3KQ8P1Z',
        address: '123 Main St, Anytown, USA 12345',
=======
        //static information on user for testing
        //to update with schema
        username: 'scurry',
        firstName: 'Steph',
        lastName: 'Curry',
        email: 'steph.curry@email.com',
        accountNumber: '00142',
        address: '30 Main St, Oakland, USA 12345',
>>>>>>> df706b0... Cleaned code, cleaned comments, small ui changes for presentation
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
<<<<<<< HEAD
        username: 'cardib',
        accountNumber: 'FAUX-M3KQ8P1Z',
=======
        username: 'scurry',
        accountNumber: '00142',
>>>>>>> df706b0... Cleaned code, cleaned comments, small ui changes for presentation
        ...data,
    }
}
