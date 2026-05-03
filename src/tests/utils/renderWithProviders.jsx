/**
 * Checks the shared render helper for page component tests.
 * Wraps components with the providers they need:
 *   MemoryRouter: pages using useNavigate, Link, useSearchParams
 *   AuthProvider: pages using useAuth()
 */

import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../@/context/AuthContext'

const MOCK_USER = {
    id: 'u-001',
    username: 'test_user',
    email: 'test@example.com',
    role: 'user',
}
const MOCK_TOKEN = 'test-jwt-token'

/**
 * Seeds localStorage with a logged-in session so AuthProvider
 * initialises as authenticated. 
 */
export function seedAuthSession() {
    localStorage.setItem('token', MOCK_TOKEN)
    localStorage.setItem('user', JSON.stringify(MOCK_USER))
}

/**
 * Renders a page component with MemoryRouter + AuthProvider.
 * @param {React.ReactElement} ui          
 * @param {{ route?: string }} options 
 */
export function renderWithProviders(ui, { route = '/' } = {}) {
    return render(
        <MemoryRouter initialEntries={[route]}>
            <AuthProvider>
                {ui}
            </AuthProvider>
        </MemoryRouter>
    )
}
