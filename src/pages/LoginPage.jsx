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
import * as authApi from '../services/auth'

// LoginPage:  renders at /login
// identifier field: accepts email address or username
// On Success:  stores JWT via AuthContext, redirects to /dashboard
//  On Failure:  displays server error inline

// Login theme and structure informed by: mui.com templates

export default function LoginPage() {

    // identifier accepts either an email address or a username
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { login } = useAuth()
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        if (!identifier.trim() || !password.trim()) {
            setError('Please enter your username or email and password')
            return
        }

        setLoading(true)
        try {
            const { user, token } = await authApi.login(identifier, password)
            login(user, token)
            navigate('/dashboard')
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
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

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <TextField
                    id="login-identifier"
                    label="Username or Email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Username or email address"
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

            <Button
                type="submit"
                variant="contained"
                disabled={loading}
                fullWidth
                size="large"
                sx={{ mb: 2, py: 1.3 }}
            >
                {loading ? (
                    <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} />
                ) : null}
                {loading ? 'Signing in…' : 'Log In'}
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
                Don&apos;t have an account?{' '}
                <Box component={Link} to="/register" sx={{ color: 'primary.main', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                    Sign Up
                </Box>
            </Typography>

            {/* Demo credentials — matches FauxVault_Seed.sql */}
            <Box
                sx={{
                    textAlign: 'center',
                    p: 1.5,
                    border: '1px solid rgba(108, 92, 231, 0.15)',
                    borderRadius: 2,
                    bgcolor: 'rgba(108, 92, 231, 0.08)',
                }}
            >
                <Typography variant="caption" color="text.secondary">
                    Demo — user:{' '}
                    <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'primary.light' }}>
                        test.user@example.com
                    </Box>
                    {' / '}
                    <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'primary.light' }}>
                        Password123
                    </Box>
                    {'  |  '}admin:{' '}
                    <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'primary.light' }}>
                        admin@fauxvault.com
                    </Box>
                    {' / '}
                    <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'primary.light' }}>
                        AdminPass123
                    </Box>
                </Typography>
            </Box>
        </Box>
    )
}
