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

const NAV_LINKS = [
    { to: '/dashboard', label: 'Dashboard'},
    { to: '/transfer', label: 'Transfer'},
    { to: '/history', label: 'History'},
    { to: '/admin', label: 'Admin'}
]

export default function NavBar() {
    return (
        <AppBar
            position="static"
            elevation={0}
            sx={{
                bgcolor: 'surface.main',
                borderBottom: '1px solid',
                borderColor: 'divider'
            }}
            >
            <Toolbar sx={{ gap: 2 }}>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #6c5ce7, #e74c3c)',
                        webkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mr: 3,
                    }}
                    >
                        FauxVault
                </Typography>

                {/* Navigation Links */}
                <Box component="nav" sx={{ display: 'flex', gap: 0.5 }}>
                    {NAV_LINKS.map((link) => (
                        <Button
                            key={link.to}
                            component={NavLink}
                            to={link.to}
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
                                {link.label}
                            </Button>
                    ))}
                </Box>

            {/* Create space */}
            <Box sx={{ flex: 1 }} />
            {/* Add user name, login link, icon */}
            </Toolbar>
        </AppBar>
    )  
}