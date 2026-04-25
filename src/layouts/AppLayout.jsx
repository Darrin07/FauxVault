import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'

//Common Components for our Page
import NavBar from '../components/NavBar'
import VulnerabilityPanel from '../components/VulnerabilityPanel'
import StatusBar from '../components/StatusBar'

//Simple Layout:  Create space for Status Bar, Navigation Bar up top, vulnerability panel on right
export default function AppLayout() {
    return (

        //Up top components:
        <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh'
        }}
        >
            <StatusBar />
            <NavBar />
            <Box sx={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden'
            }}
            >
                {/* Use Outlet to serve as placeholder for child routes */}
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