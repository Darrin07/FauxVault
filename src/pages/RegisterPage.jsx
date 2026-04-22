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
import * as authAPI from '../api/auth'

//Registration Page.  Returns { token, user: {id, email, name, role } }
//Based on MUI Free Templates over Sign-up, using similar logic for components
//Email validator regex instructoin from: https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript

//Register Functions
export default function RegisterPage() {
    const [form, setForm] = useState({
        name: '',
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
            return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

            //If error, clear field on change to reset
            if (errors[field]) {
                setErrors((prev) => ({...prev, [field]: ''}))
            }
        }

    //This function confirms that the information this user has given us is valid for registration
    //Can be used for exploitation in the future possibly
    function validate() {
        const errs = {};
        
        //Case:  No Name or email, email format wrong
        if (!form.name.trim()) errs.name = 'Name Required';
        if (!form.email.trim()) errs.email = 'Email Required'
        //Regex on email pattern; not RFC-Compliant; general direction from stackoverflow cited 
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid Email Format'

        //Password validation:  missing, short, doesn't match
        if (!form.password) errs.password = 'Password Required'
        else if (form.password.length < 5) errs.password = 'Minimum 5 characters'
        if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords did not match'

    }

    async function handleSubmit(e) {
        e.preventDefault()
        setApiError('')

        //Run our validation function; if any appear, set our error messages
        const errs = validate()
        if (Object.keys(errs).length > 0) {
            setErrors(errs)
            return
        }

        //Set our loading
        setLoading(true)
        //Try to register our user, then log them in, and send them to dashboard
        try {
            const { user, token } = await authAPI.register({
                email: form.email,
                password: form.password,
                name: form.name,
            })
            login(user, token)
            navigate('/dashboard')
        } catch(err) {
            setApiError(err.message || 'Registration Failed. Please Try Again.')
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
                }}>
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
                <TextField
                    id="signup-name"
                    label="Full Name"
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder='Full Name'
                    error={!!errors.name}
                    helperText={errors.name}

                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <UserIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        )
                    }}
                />

                <TextField
                    id="signup-email"
                    label="Email"
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder='name@example.com'

                    error={!!errors.email}
                    helperText={errors.email}

                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <UserIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        )
                    }}
                />

                <TextField
                    id="signup-password"
                    label="Password"
                    value={form.password}
                    onChange={handleChange('password')}
                    placeholder='Minimum 5 Characters'

                    error={!!errors.password}
                    helperText={errors.password}

                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <UserIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        )
                    }}
                />

                <TextField
                    id="signup-confirm-password"
                    label="Confirm Password"
                    value={form.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    placeholder='Re-enter your password'

                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}

                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <UserIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        )
                    }}
                />
            </Box>
            <Button
                type='submit'
                variant='contained'
                
                fullWidth
                size='large'
                disabled={loading}
                sx={{ mb: 2, py: 1.3 }}
                >
                    {loading ? (<CircularProgress size={22} color="inherit" sx={{ mr: 1 }} />) : null}
                    {loading ? 'Creating Account (Please Wait)' : 'Create Account'}
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
                        }}>
                            Log In
                        </Box>
                </Typography>
        </Box>
    )
}