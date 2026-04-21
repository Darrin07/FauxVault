import { Box, Typography } from '@mui/material'
import { ShieldOutlined as ShieldCheck, GppBadOutlined as ShieldAlert } from '@mui/icons-material'
import { useVulnerabilities } from '../hooks/useVulnerabilities'

export default function StatusBar() {
    const { isVulnerable } = useVulnerabilities()

    return (
        <Box
            role="status"
            aria-live="polite"
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                px: 2,
                height: 40,
                background: isVulnerable
                    ? 'linear-gradient(90deg, #8b1a1a, #c0392b 30%, #e74c3c 50%, #c0392b 70%, #8b1a1a)'
                    : 'linear-gradient(90deg, #145a32, #1e8449 30%, #27ae60 50%, #1e8449 70%, #145a32)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 8s linear infinite',
                transition: 'background 0.4s ease',
                '@keyframes shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            }}
        >
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
