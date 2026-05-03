import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    InputAdornment,
    Card,
    CardContent,
    CircularProgress,
    Divider,
} from '@mui/material'
import {
    Person as UserIcon,
    Email as MailIcon,
    Save as SaveIcon,
} from '@mui/icons-material'
import * as usersApi from '../services/users'

// AdminPage: renders at /admin (accessible to all authenticated users)
// Loads full profile from GET /users/profile on mount to seed form and read accountNumber
// On Success: green Alert for 3 seconds; AuthContext user updated via updateProfile()
// On Failure: red Alert shows server error; fields stay populated

export default function AdminPage() {

    const { user, updateProfile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ name: '', email: '' })
    const [accountNumber, setAccountNumber] = useState('')
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    // Load full profile on mount; auth context user has { id, username, email, role }
    useEffect(() => {
        async function fetchProfile() {
            try {
                const { user: profile } = await usersApi.getProfile()
                setForm({
                    name: profile.name || '',
                    email: profile.email || '',
                })
                setAccountNumber(profile.accountNumber || '')
            } catch (err) {
                console.error('Failed to load profile:', err)
            }
        }
        fetchProfile()
    }, [])

    function handleChange(field) {
        return (e) => {
            setForm((prev) => ({ ...prev, [field]: e.target.value }))
            setSaved(false)
            setError('')
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Send name and email
            const { user: updatedUser } = await usersApi.updateProfile({
                name: form.name,
                email: form.email,
            })

            // update user in AuthContext and localStorage
            updateProfile(updatedUser)

            // show success state for 3 seconds
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            setError(err.message || 'Failed to save changes. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box>
            <Typography variant="h1" sx={{ fontSize: '1.75rem', mb: 0.5 }}>
                Admin
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manage account settings
            </Typography>

            <Card sx={{ maxWidth: 640 }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h3" sx={{ fontSize: '1.1rem', mb: 2 }}>
                        Account Information
                    </Typography>

                    {saved && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            Profile updated successfully
                        </Alert>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}

                    {/* Read-only identity panel */}
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 3,
                            mb: 3,
                            p: 2,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'rgba(255,255,255,0.02)',
                        }}
                    >
                        <Box>
                            <Typography variant="caption" color="text.disabled">
                                Username
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {user?.username}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.disabled">
                                Account Number
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}
                            >
                                {accountNumber ? `#${accountNumber}` : '—'}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    {/* Editable profile fields */}
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                        {/* Display Name */}
                        <TextField
                            id="profile-name"
                            label="Display Name"
                            value={form.name}
                            onChange={handleChange('name')}
                            placeholder="Your full name"
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <UserIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Email */}
                        <TextField
                            id="profile-email"
                            label="Email Address"
                            type="email"
                            value={form.email}
                            onChange={handleChange('email')}
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <MailIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Box sx={{ mt: 1 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                                disabled={loading}
                            >
                                {loading ? 'Saving…' : 'Save Changes'}
                            </Button>
                        </Box>
                    </Box>

                </CardContent>
            </Card>
        </Box>
    )
}
