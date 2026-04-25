
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

// Page should allow users to make updates on their account; can be leveraged for injection
// TODO:  Move common functions from Pages to be exported to clean code in final updates


export default function AdminPage() {

    // Initialize
    const { user, updateProfile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        address: '',
    })

    //useState to manage our state for saved changes
    const [saved, setSaved] = useState(false)

    //Values from Form
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

    //Update change
    function handleChange(field) {
        return (e) => {
            setForm((prev) => ({ ...prev, [field]: e.target.value }))
            setSaved(false)
        }
    }

    //send information to update
    async function handleSubmit(e) {
        
        //prevent default
        e.preventDefault()

        setLoading(true)

        //Attempt to update
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

        //Header Box with static page information, sub-header 
        <Box>
            <Typography variant="h1" sx={{ fontSize: '1.75rem', mb: 0.5 }}>
                Admin
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manage account settings
            </Typography>

            <Card sx={{ maxWidth: 640 }}>

                {/* Account Information */}
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h3" sx={{ fontSize: '1.1rem', mb: 2 }}>
                        Account Information
                    </Typography>

                    {/* Profile is updated: */}
                    {saved && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            Profile updated successfully
                        </Alert>
                    )}

                    {/* Read-only fields - should appear after user logs in*/}
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

                            {/* If user: put username */}
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {user?.username}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.disabled">
                                Account Number
                            </Typography>
                            {/* If User, account number */}
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}
                            >
                                #{user?.accountNumber}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    {/* Editable form inputs: first name, last name, email, (? address) */}
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>

                            {/* First Name */}
                            <TextField
                                id="profile-first-name"
                                label="First Name"
                                value={form.firstName}
                                onChange={handleChange('firstName')}

                                // Design Changes
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

                                //Design Changes (same as first name)
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

                        {/* Email */}
                        <TextField
                            id="profile-email"
                            label="Email Address"
                            type="email"
                            value={form.email}
                            onChange={handleChange('email')}

                            //Design Changes
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <MailIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Address */}
                        <TextField
                            id="profile-address"
                            label="Address"
                            value={form.address}
                            onChange={handleChange('address')}
                            placeholder="Street, City, State, ZIP"

                            //Design Changes
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <MapIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Submit button, use contained variant */}
                        <Box sx={{ mt: 1 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                                disabled={loading}
                            >
                                {/* Loading phases plausible: saving and save changes */}
                                {loading ? 'Saving…' : 'Save Changes'}
                            </Button>
                        </Box>

                    </Box>

                </CardContent>
            </Card>
            
        </Box>
    )
}
