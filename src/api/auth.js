import { mockDelay } from './client'

/* ── Mock user database ── */
const MOCK_USERS = [
    {
        id: 1,
        username: 'cardib',
        password: 'password123',
        firstName: 'Belcalis',
        lastName: 'Almanzar',
        email: 'cardi.b@email.com',
        accountNumber: '00142',
        address: '123 Main St, New York City, USA 12345',
    },
    {
        id: 2,
        username: 'jsmith',
        password: 'password456',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@email.com',
        accountNumber: '00287',
        address: '456 Oak Ave, Somewhere, USA 67890',
    },
]

/**
 * POST /api/auth/login
 */
export async function login(username, password) {
    await mockDelay()

    const user = MOCK_USERS.find(
        (u) => u.username === username && u.password === password
    )

    if (!user) {
        throw new Error('Invalid username or password')
    }

    /* Never send password back */
    const { password: _, ...safeUser } = user
    return {
        user: safeUser,
        token: `mock-jwt-${user.id}-${Date.now()}`,
    }
}

/**
 * POST /api/auth/signup
 */
export async function signup({ username, password, firstName, lastName, email }) {
    await mockDelay()

    const exists = MOCK_USERS.find((u) => u.username === username)
    if (exists) {
        throw new Error('Username already taken')
    }

    const newUser = {
        id: MOCK_USERS.length + 1,
        username,
        firstName,
        lastName,
        email,
        accountNumber: String(Math.floor(Math.random() * 90000) + 10000),
        address: '',
    }

    MOCK_USERS.push({ ...newUser, password })

    return {
        user: newUser,
        token: `mock-jwt-${newUser.id}-${Date.now()}`,
    }
}

/**
 * POST /api/auth/logout
 */
export async function logout() {
    await mockDelay(100)
    return { success: true }
}
