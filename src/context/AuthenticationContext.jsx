import { createContext } from 'react'

const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    error: null
}


/** AuthContext - create the context, initialize state, use a reducer for login-logic, create auth provider */