import { apiFetch, mockDelay } from './client'

/**
 * Mock user store matching the real DB schema:
 *   users(user_id, username, email, password_bcrypt, role)
 *   accounts(account_id, user_id, account_number, balance, account_type)
 *
 * The server's sanitizeUser() returns: { id, email, name, role }
 * We mirror that exact shape so the UI works against both mock and real API.
 */
const MOCK_USERS = [
    {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@email.com',
        passwordHash: 'password123',   // plaintext stand-in for mock only
        role: 'user',
        accountNumber: 'FAUX-M3KQ8P1Z',
        address: '123 Main St, Anytown, USA 12345',
    },
    {
        id: 2,
        name: 'Jane Smith',
        email: 'jane.smith@email.com',
        passwordHash: 'password456',
        role: 'user',
        accountNumber: 'FAUX-R7NW2D4X',
        address: '456 Oak Ave, Somewhere, USA 67890',
    },
]

/**
 * Mirrors server's sanitizeUser() — strips passwordHash before returning to client.
 */
function sanitizeUser(user) {
    return { id: user.id, email: user.email, name: user.name, role: user.role }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user: { id, email, name, role } }
 */
export async function login(email, password) {
    const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    }, async () => {
        await mockDelay()
        const user = MOCK_USERS.find(
            (u) => u.email === email && u.passwordHash === password
        )
        if (!user) throw new Error('Invalid email or password')
        return {
            token: `mock-jwt-${user.id}-${Date.now()}`,
            user: sanitizeUser(user),
        }
    });

    if (data.token) localStorage.setItem('token', data.token);
    return data;
}

/**
 * POST /api/auth/register
 * Body: { email, password, name }
 * Returns: { token, user: { id, email, name, role } }
 */
export async function register({ email, password, name }) {
    const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
    }, async () => {
        await mockDelay()
        const exists = MOCK_USERS.find((u) => u.email === email)
        if (exists) throw new Error('Email already registered')

        const newUser = {
            id: MOCK_USERS.length + 1,
            name,
            email,
            passwordHash: password,
            role: 'user',
            accountNumber: 'FAUX-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            address: '',
        }
        MOCK_USERS.push(newUser)
        return {
            token: `mock-jwt-${newUser.id}-${Date.now()}`,
            user: sanitizeUser(newUser),
        }
    });

    if (data.token) localStorage.setItem('token', data.token);
    return data;
}

/**
 * POST /api/auth/logout
 * Server simply returns { message: 'Logged out' }
 */
export async function logout() {
    const data = await apiFetch('/auth/logout', { 
        method: 'POST' 
    }, async () => {
        await mockDelay(100)
        return { message: 'Logged out' }
    });

    localStorage.removeItem('token');
    return data;
}
