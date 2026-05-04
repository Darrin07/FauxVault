import { Outlet } from 'react-router-dom'
import { Box, Typography } from '@mui/material'
import StatusBar from '../components/StatusBar'
import VulnerabilityPanel from '../components/VulnerabilityPanel'

//Layout using card for login & registration
//Theme influenced by MUI free templates for registration and login, with existing color scheme in this app
//https://mui.com/material-ui/getting-started/templates/

export default function AuthLayout() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                p: 3,
                background: 'linear-gradient(135deg, #121220 0%, #1a1a2e 50%, #121220 100%)'
            }}
        >
            {/* StatusBar at the top */}
            <StatusBar />

            {/* Content Row: login/registe rcard + vulnerability panel */}
            <Box
                sx={{
                    display: 'flex',
                    flex: 1,
                    overflow: 'hidden'
                }}
            >
                {/* Centre col: login/register card */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p:3,
                        overflowY: 'auto',
                        background: 'linear-gradient(135deg, #121220 0%, #1a1a2e 50%, #121220 100%)'
                    }}
                >
                    <Box
                        sx={{
                            bgcolor: 'background.paper',
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',

                            width: '100%',
                            minWidth: 460,

                            p: { xs: 3, sm: 4},
                            boxShadow: 4,
                        }}>

                        {/* Header */}
                        <Box sx={{ textAlight: 'center', mb: 3 }}>
                            <Typography
                                variant="h1"
                                sx={{
                                    fontSize: '2rem',
                                    fontWeight: 800,

                                    background: 'linear-gradient(135deg, #6c5ce7, #e74c3c)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    mb: 0.5,
                                }}>
                                    FauxVault
                                </Typography>
                        </Box>
                        <Outlet />
                    </Box>

                <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ mt: 3, textAlign: 'center', maxWidth: 400 }}>
                        Note:  This Application is Intentionally Vulnerable
                    </Typography>
                </Box>
                {/* Vulnerability Panel */}
                <VulnerabilityPanel />
            </Box>
        </Box>
    )
}