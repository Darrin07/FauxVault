import { createContext, useReducer, useCallback } from 'react'

export const AuthContext = createContext(null)

const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
}

function authReducer(state, action) {
    switch (action.type) {
        case 'LOGIN_START':
            return { ...state, isLoading: true, error: null }

        case 'LOGIN_SUCCESS':
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            }

        case 'LOGIN_FAILURE':
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload,
            }

        case 'LOGOUT':
            return { ...initialState }

        case 'UPDATE_PROFILE':
            return {
                ...state,
                user: { ...state.user, ...action.payload },
            }

        case 'CLEAR_ERROR':
            return { ...state, error: null }

        default:
            return state
    }
}

export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState)

    const login = useCallback((user, token) => {
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } })
    }, [])

    const logout = useCallback(() => {
        dispatch({ type: 'LOGOUT' })
    }, [])

    const updateProfile = useCallback((updates) => {
        dispatch({ type: 'UPDATE_PROFILE', payload: updates })
    }, [])

    const setLoading = useCallback((loading) => {
        dispatch({ type: loading ? 'LOGIN_START' : 'CLEAR_ERROR' })
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
