// Will create a Navbar at the top of our site
// Note:  Claude Code helped build out an outline and provide support on how to get components to chanage

import { NavLink, useNavigate } from "react-router-dom";
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    Button,
    Avatar,
    IconButton,
    Tooltip,
} from '@mui/material'
import { Logout as LogOutIcon } from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth'


//TODO:  Verify Routes
const NAV_LINKS = [
    { to: '/dashboard', label: 'Dashboard'},
    { to: '/transfer', label: 'Transfer'},
    { to: '/history', label: 'History'},
    { to: '/admin', label: 'Admin'}
]


//Functions under NavBar:  Initialize User, 
export default function NavBar() {

    //initialize user
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    //Give visual signal that user is the correct person; for exploit later?
    const initials = user
        ? `${(user.firstName?.[0] || '').toUpperCase()}${(user.lastName?.[0] || '').toUpperCase()}`
        : ''

    //helper to logout
    function handleLogout() {
        logout()
        navigate('/login')
    }

    return (
        <AppBar
        // Place at top, does not move
            position="static"
            elevation={0}
            sx={{
                bgcolor: 'surface.main',
                borderBottom: '1px solid',
                borderColor: 'divider'
            }}
            >
            <Toolbar sx={{ gap: 2 }}>

                {/* replace with iconography */}
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 800,
                        background: 'rgba(221, 236, 234, 0.87)',
                        webkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mr: 3,
                    }}
                    >
                        FauxVault
                </Typography> 

                {/* Navigation Links in the bar:  Map usage on links */}
                <Box component="nav" sx={{ display: 'flex', gap: 0.5 }}>
                    {NAV_LINKS.map((link) => (
                        //Buttons:  Key, Component = NavLink from React, link 
                        <Button
                            //information on link
                            key={link.to}
                            component={NavLink}
                            to={link.to}

                            //Looks
                            size="small"
                            sx={{
                                color: 'text.secondary',
                                fontWeight: 500,
                                px: 2,
                                py: 1,
                                borderRadius: 2,
                                transition: 'all 0.2s',
                                position: 'relative',
                                '&:hover': {
                                    color: 'text.primary',
                                    bgcolor: 'rgba(108, 92, 231, 0.08)',
                                },
                                //If page is active, make bigger to make it easier to see
                                '&.active': {
                                    color: 'primary.main',
                                    bgcolor: 'rgba(108, 92, 231, 0.12)',
                                    fontWeight: 600, 
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        bottom: 0,
                                        left: '20%',
                                        width: '60%',
                                        height: 2,
                                        bgcolor: 'primary.main',
                                        borderRadius: 1,
                                    }
                                },
                            }}
                            >
                                {/* add label */}
                                {link.label}
                            </Button>
                    ))}
                </Box>

            {/* Create space */}
            <Box sx={{ flex: 1 }} />
            {/* Add user name, login link, icon */}
                {user && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {/* Need indication that user could change; will leverage React Avatar */}
                        <Avatar
                            sx={{
                                width: 34,
                                height: 34,
                                bgcolor: 'primary.main',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                            }}
                        >
                            {initials}
                        </Avatar>

                        {/* Add User's name for additional confirmation */}
                        <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                {user.firstName} {user.lastName}
                            </Typography>

                            {/* User's Account Number */}
                            <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem' }}
                            >
                                Acct #{user.accountNumber}
                            </Typography>
                        </Box>

                        {/* React's Tooltip for Logging out */}
                        <Tooltip title="Log out">
                            <IconButton
                                onClick={handleLogout}
                                size="small"
                                aria-label="Log out"
                                sx={{
                                    color: 'text.secondary',
                                    ml: 1,
                                    '&:hover': { color: 'error.main', bgcolor: 'rgba(231,76,60,0.1)' },
                                }}
                            >
                                <LogOutIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    )  
}