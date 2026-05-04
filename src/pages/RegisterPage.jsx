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
    Email as EmailIcon,
    Lock as LockIcon,
} from '@mui/icons-material'
import * as authAPI from '../services/auth'
import { validateRegistration } from '../utils/validate'

// RegisterPage:  renders at /register
// Server contract: POST /auth/register expects { username, email, password }
// Server returns: { token, user: { id, username, email, role } }
// On Success: stores JWT via AuthContext, redirects to /dashboard
// On Failure:  client-side validation displays inline; API error displays in Alert
// Email validator regex from: https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript

export default function RegisterPage() {
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    })
    const [errors, setErrors] = useState({})
    const [apiError, setApiError] = useState('')
    const [loading, setLoading] = useState(false)

    const { login } = useAuth()
    const navigate = useNavigate()

    function handleChange(field) {
        return (e) => {
            setForm((prev) => ({ ...prev, [field]: e.target.value }))
            // Clear the field's error as soon as the user corrects
            if (errors[field]) {
                setErrors((prev) => ({ ...prev, [field]: '' }))
            }
        }
    }



    async function handleSubmit(e) {
        e.preventDefault()
        setApiError('')

        // Run validation; will stop and show errors if failure
        const errs = validateRegistration(form)
        if (Object.keys(errs).length > 0) {
            setErrors(errs)
            return
        }

        // Set loading state for submit button, attempt registration
        setLoading(true)
        try {
            const { user, token } = await authAPI.register({
                username: form.username,
                email: form.email,
                password: form.password,
            })
            login(user, token)
            navigate('/dashboard')
        } catch (err) {
            setApiError(err.message || 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography
                variant="h2"
                sx={{
                    fontSize: '1.5rem',
                    mb: 0.5
                }}
            >
                Create Account
            </Typography>

            {apiError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {apiError}
                </Alert>
            )}

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                mb: 3
            }}>
                {/* Username */}
                <TextField
                    id="signup-username"
                    label="Username"
                    value={form.username}
                    onChange={handleChange('username')}
                    placeholder="Letters, numbers, underscores (e.g. john_doe)"
                    autoComplete="username"
                    error={!!errors.username}
                    helperText={errors.username}
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <UserIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        )
                    }}
                />

                {/* Email */}
                <TextField
                    id="signup-email"
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder="name@example.com"
                    autoComplete="email"
                    error={!!errors.email}
                    helperText={errors.email}
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <EmailIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        )
                    }}
                />

                {/* Password */}
                <TextField
                    id="signup-password"
                    label="Password"
                    type="password"
                    value={form.password}
                    onChange={handleChange('password')}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    error={!!errors.password}
                    helperText={errors.password}
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        )
                    }}
                />

                {/* Confirm Password */}
                <TextField
                    id="signup-confirm-password"
                    label="Confirm Password"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        )
                    }}
                />
            </Box>

            <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ mb: 2, py: 1.3 }}
            >
                {loading ? <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} /> : null}
                {loading ? 'Creating Account…' : 'Create Account'}
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Already have an account?{' '}
                <Box
                    component={Link}
                    to="/login"
                    sx={{
                        color: 'primary.main',
                        fontWeight: 600,
                        '&:hover': { textDecoration: 'underline' }
                    }}
                >
                    Log In
                </Box>
            </Typography>
        </Box>
    )
}
