import { useContext } from 'react'
import { AuthContext } from '../context/AuthContextObject'

//Calls on the Authentication context to connec tto components

export function useAuth() {
    const context = useContext(AuthContext)
    //Error Case:  No AuthContext
    if (!context) {
        throw new Error('useAuth not found')
    }
    return context
}
