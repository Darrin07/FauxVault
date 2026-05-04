import { createContext, useReducer, useCallback } from 'react'

/**  AuthContext — manages authentication state across the app.
*
* Session is persisted to localStorage so page refreshes won't log out our user.
* Token and user obj are stored.  The token will be used for API calls, and the user obj for UI.
* Server's sanitizeUser() shape: { id, username, email, role }
* Citation, informed by: https://medium.com/@0xJad/manage-authentication-state-in-react-with-authcontext-2d3129eac92b
*/

export const AuthContext = createContext(null)

// Baseline "logged out" state — used by LOGOUT and as fallback in getInitialState
const EMPTY_STATE = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
}

/**
 * Functions:  Gets state, reads token and user from localStorage in order to restore a previous session.
 * Returns EMPTY_STATE if either the token or obj is missing, or the stored data is corrupted.
 * Uses lazy initialization, so it will pass as the third argument to useReducer.
 **/

function getInitialState() {
    try {
        const token = localStorage.getItem('token')
        const user = JSON.parse(localStorage.getItem('user') || 'null')
        if (token && user) {
            return { ...EMPTY_STATE, user, token, isAuthenticated: true }
        }
    } catch {
        // If there is an issue w/localStorage, we clear it and start over
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }
    return { ...EMPTY_STATE }
}

function authReducer(state, action) {
    switch (action.type) {

        // Login request is in flight
        case 'LOGIN_START':
            return { ...state, isLoading: true, error: null }

        // Login succeeded.  Persist user via localStorage
        case 'LOGIN_SUCCESS':
            localStorage.setItem('user', JSON.stringify(action.payload.user))
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            }

        // Login fails
        case 'LOGIN_FAILURE':
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload,
            }

        // User logs out.  Clear localStorage so a refresh won't restore the session
        case 'LOGOUT':
            localStorage.removeItem('user')
            localStorage.removeItem('token')
            return { ...EMPTY_STATE }

        // Profile updated.  Sync the new user data to localStorage
        case 'UPDATE_PROFILE': {
            const updatedUser = { ...state.user, ...action.payload }
            localStorage.setItem('user', JSON.stringify(updatedUser))
            return { ...state, user: updatedUser }
        }

        // Loading finished but neither success or failure 
        case 'LOADING_DONE':
            return { ...state, isLoading: false }

        case 'CLEAR_ERROR':
            return { ...state, error: null }

        default:
            return state
    }
}

export function AuthProvider({ children }) {

    // The third argument: getInitialState is called once by React to set up initial state, restoring
    // the session from localStorage on a page refresh.
    const [state, dispatch] = useReducer(authReducer, undefined, getInitialState)

    const login = useCallback((user, token) => {
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } })
    }, [])

    const updateProfile = useCallback((updates) => {
        dispatch({ type: 'UPDATE_PROFILE', payload: updates })
    }, [])

    const logout = useCallback(() => {
        dispatch({ type: 'LOGOUT' })
    }, [])

    // Separated into two distinct concerns — loading state and error state
    const setLoading = useCallback((loading) => {
        dispatch({ type: loading ? 'LOGIN_START' : 'LOADING_DONE' })
    }, [])

    const setError = useCallback((error) => {
        dispatch({ type: 'LOGIN_FAILURE', payload: error })
    }, [])

    const clearError = useCallback(() => {
        dispatch({ type: 'CLEAR_ERROR' })
    }, [])

    const value = {
        ...state,
        login,
        logout,
        updateProfile,
        setLoading,
        setError,
        clearError,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
