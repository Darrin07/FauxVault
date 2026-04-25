import { Box, Typography } from '@mui/material'
import { ShieldOutlined as ShieldCheck, GppBadOutlined as ShieldAlert } from '@mui/icons-material'
import { useVulnerabilities } from '../hooks/useVulnerabilities'

// Creates our function for the status bar, which tells us if a module is open (secondary visual)
//Functions for status bar: vulnerability hook to determine if vulnerable.
//Based on React suggestion for status bar: https://reactnative.dev/docs/statusbar

export default function StatusBar() {

    //Get state of site
    var { isVulnerable } = useVulnerabilities()
    return (

        //Build our status bar:  box w/information central
        <Box
            role="status"
            sx={{
                display: 'flex',
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                px: 2,
                
                //if the app is vulnerable or not determines color
                background: isVulnerable
                    ? 'linear-gradient(90deg, #8b1a1a, #c0392b 30%, #e74c3c 50%, #c0392b 70%, #8b1a1a)'
                    : 'linear-gradient(90deg, #145a32, #1e8449 30%, #27ae60 50%, #1e8449 70%, #145a32)',
                backgroundSize: '200% 100%',

                // Shimmer is added just to showcase fun react capability; can remove
                animation: 'shimmer 8s linear infinite', 
                transition: 'background 0.4s ease',
                '@keyframes shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            }}
        >
            {/* If module is vulnerable use shieldAlert, give message */}
            {isVulnerable ? (
                <ShieldAlert sx={{ fontSize: 16 }} />
            ) : (
                <ShieldCheck sx={{ fontSize: 16 }} />
            )}
            <Typography
                variant="caption"
                sx={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
                {isVulnerable
                    ? 'This application is vulnerable'
                    : 'All modules hardened — application is in secure mode'}
            </Typography>
        </Box>
    )
}
