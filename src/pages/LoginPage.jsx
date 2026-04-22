// TODO:  Fix login page width (box fills screen)

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    InputAdornment,
    CircularProgress,
} from '@mui/material'
import {
    Person as UserIcon,
    Lock as LockIcon,
} from '@mui/icons-material'
import * as authApi from '../api/auth'

//Functions for Login
export default function LoginPage() {
    //Initialize
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    //Connect Login func to our hook
    const { login } = useAuth()
    const navigate = useNavigate()

     // Helper function to handle changes within fields and setting values
    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password')
            return
        }

        setLoading(true)
        try {
            const { user, token } = await authApi.login(username, password)
            login(user, token)
            navigate('/dashboard')
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (

        //Greeting for user on sign-in
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography variant="h2" sx={{ fontSize: '1.5rem', mb: 0.5 }}>
                Welcome back
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Sign in to your account
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Input for login information, password */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <TextField
                    id="login-username"
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <UserIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />
                <TextField
                    id="login-password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {/* Submisson Button */}
            <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ mb: 2, py: 1.3 }}
            >
                {loading ? (
                    <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} />
                ) : null}
                {loading ? 'Signing in…' : 'Log In'}
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
                Don&apos;t have an account?{' '}
                <Box
                    component={Link} to="/signup" sx={{ color: 'primary.main', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                >
                    Sign Up
                </Box>
            </Typography>

            <Box
                sx={{
                    textAlign: 'center',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(108, 92, 231, 0.08)',
                    border: '1px solid rgba(108, 92, 231, 0.15)',
                }}
            >

                {/* REMOVE AFTER TESTING */}
                <Typography variant="caption" color="text.secondary">
                    Demo credentials:{' '}
                    <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'primary.light' }}>
                        cardib
                    </Box>
                    {' / '}
                    <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'primary.light' }}>
                        password123
                    </Box>
                </Typography>
            </Box>
        </Box>
    )
}
