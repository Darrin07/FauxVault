import { createContext, useReducer, useCallback } from 'react'

//Our Auth Context will use createContext from React to pass information down to other components; uses Reducer to 
//manage state for lower components
//While code is different, this code is informed by: https://medium.com/@0xJad/manage-authentication-state-in-react-with-authcontext-2d3129eac92b
//and uses similar logic considerations (with a hook used elsewhere)

export const AuthContext = createContext(null)

    //State needed on user to access pages
    const initialState = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
    }

    //Function: Authentication state managed by our reducer      
    function authReducer(state, action) {
        switch (action.type) {

            //Case 1:  Login starting
            case 'LOGIN_START':
                return { ...state, isLoading: true, error: null }

            //Case 2:  Login worked
            case 'LOGIN_SUCCESS':
                return {
                    ...state,
                    user: action.payload.user,
                    token: action.payload.token,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                }

            //Case 3:  Login Fails (can be exploited later)
            case 'LOGIN_FAILURE':
                return {
                    ...state,
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: action.payload,
                }

            //Case 4:  Successful login is closed
            case 'LOGOUT':
                return { ...initialState }

            //Case 5:  Information is updated; use the user as key
            //Possible update w/API
            case 'UPDATE_PROFILE':
                return {
                    ...state,
                    user: { ...state.user, ...action.payload },
                }

            //Case 6:  Need to fix Error
            case 'CLEAR_ERROR':
                return { ...state, error: null }

            default:
                return state
        }
    }

//Now our AuthProvider can manage via functions    
export function AuthProvider({ children }) {

    //Initialize w/reducer using our authReducer and our initial state to create state and dispatch
    const [state, dispatch] = useReducer(authReducer, initialState)

    //Login
    const login = useCallback((user, token) => {
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } })
    }, [])

    //Update Profile
    const updateProfile = useCallback((updates) => {
        dispatch({ type: 'UPDATE_PROFILE', payload: updates })
    }, [])

    //Logout, no payload
    const logout = useCallback(() => {
        dispatch({ type: 'LOGOUT' })
    }, [])

    //setLoading - type of loading
    const setLoading = useCallback((loading) => {
        dispatch({ type: loading ? 'LOGIN_START' : 'CLEAR_ERROR' })
    }, [])

    //setError - type of error 
    const setError = useCallback((error) => {
        dispatch({ type: 'LOGIN_FAILURE', payload: error })
    }, [])

    //clear our Error
    const clearError = useCallback(() => {
        dispatch({ type: 'CLEAR_ERROR' })
    }, [])

    //After determining all vars, send as value to Provider
    const value = {...state, login, logout, updateProfile, setLoading, setError, clearError,}

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
