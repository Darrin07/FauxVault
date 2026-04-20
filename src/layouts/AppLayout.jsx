import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import NavBar from '../components/NavBar'
import VulnerabilityPanel from '../components/VulnerabilityPanel'

export default function AppLayout() {
    return (
        <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh'
        }}
        >
            <NavBar />
            <Box sx={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden'
            }}
            >
                <Box
                    compnent="main"
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        p: { xs: 2, sm: 3, md: 4},
                        maxHeight: 'calc(100vh - 104px)'
                    }}
                    >
                        <Outlet />
                </Box>
                <VulnerabilityPanel />
            </Box>
        </Box>
    )
}