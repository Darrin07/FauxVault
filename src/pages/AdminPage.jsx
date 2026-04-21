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
    LocationOn as MapIcon,
    Save as SaveIcon,
} from '@mui/icons-material'
import * as usersApi from '../api/users'

export default function AdminPage() {
    const { user, updateProfile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        address: '',
    })
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (user) {
            setForm({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                address: user.address || '',
            })
        }
    }, [user])

    function handleChange(field) {
        return (e) => {
            setForm((prev) => ({ ...prev, [field]: e.target.value }))
            setSaved(false)
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        try {
            const updatedUser = await usersApi.updateProfile(form)
            updateProfile(updatedUser)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            console.error('Failed to update profile:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box>
            <Typography variant="h1" sx={{ fontSize: '1.75rem', mb: 0.5 }}>
                Administration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manage your account settings and profile
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

                    {/* Read-only fields */}
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 3,
                            mb: 3,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.02)',
                            border: '1px solid',
                            borderColor: 'divider',
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
                                #{user?.accountNumber}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    {/* Editable form */}
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                id="profile-first-name"
                                label="First Name"
                                value={form.firstName}
                                onChange={handleChange('firstName')}
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
                                id="profile-last-name"
                                label="Last Name"
                                value={form.lastName}
                                onChange={handleChange('lastName')}
                                fullWidth
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <UserIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>

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

                        <TextField
                            id="profile-address"
                            label="Address"
                            value={form.address}
                            onChange={handleChange('address')}
                            placeholder="Street, City, State, ZIP"
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <MapIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
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
