import { useState, useEffect, useCallback } from 'react'
import {
    Card,
    CardContent,
    Box,
    Typography,
    Chip,
    IconButton,
    Tooltip,
    Divider,
    Alert,
} from '@mui/material'
import {
    Security as SecurityIcon,
    ContentCopy as CopyIcon,
    Visibility as VisibleIcon,
    VisibilityOff as HiddenIcon,
} from '@mui/icons-material'
import { useVulnerabilities } from '../hooks/useVulnerabilities'

/**
 * SessionInspector: displays the current session's security posture.
 * Shows cookie flags, token visibility, and localStorage state.
 * Users can see what JavaScript can access in vulnerable vs hardened mode.
 *
 * Vulnerability Module: weak_session_tokens (A07)
 *  - Vulnerable: token visible in document.cookie + localStorage; insecure flags
 *  - Hardened: token invisible to JS; secure flags
 */
export default function SessionInspector() {
    const { modules } = useVulnerabilities()
    const isVulnerable = modules.find(m => m.id === 'weak_session_tokens')?.enabled ?? false

    const [cookieValue, setCookieValue] = useState(document.cookie || '')
    const [localStorageToken, setLocalStorageToken] = useState(localStorage.getItem('token'))
    const [copied, setCopied] = useState(false)

    // View what JavaScript can actually see
    const refreshTokenState = useCallback(() => {
        setCookieValue(document.cookie || '')
        setLocalStorageToken(localStorage.getItem('token'))
    }, [])

    useEffect(() => {
        const interval = setInterval(refreshTokenState, 2000)
        return () => clearInterval(interval)
    }, [refreshTokenState])

    // Extract the token cookie value
    const tokenCookie = cookieValue
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith('token='))

    const jsAccessibleToken = tokenCookie?.split('=')?.[1] || null
    const hasJsAccessibleToken = Boolean(jsAccessibleToken || localStorageToken)

    // Pending: module is set to vulnerable but current session cookies are still hardened
    // (user toggled without re-logging in — cookie flags are set at login time)
    const pendingVulnerableLogin = isVulnerable && !hasJsAccessibleToken
    const pendingHardenedLogin = !isVulnerable && hasJsAccessibleToken
    const isPending = pendingVulnerableLogin || pendingHardenedLogin

    function handleCopy() {
        const tokenToCopy = jsAccessibleToken || localStorageToken
        if (tokenToCopy) {
            navigator.clipboard.writeText(tokenToCopy)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    // Truncate JWT for display
    function truncateToken(token) {
        if (!token) return '(not accessible)'
        return token.length > 30 ? `${token.substring(0, 30)}…` : token
    }

    // Cookie flag display config
    const flags = [
        {
            label: 'HttpOnly',
            vulnerable: false,
            hardened: true,
            description: hasJsAccessibleToken
                ? 'Cookie IS accessible to JavaScript — XSS can steal it'
                : 'Cookie is NOT accessible to JavaScript — XSS cannot steal it',
        },
        {
            label: 'Secure',
            vulnerable: false,
            hardened: true,
            description: hasJsAccessibleToken
                ? 'Cookie sent over HTTP (unencrypted) — network sniffing possible'
                : 'Cookie only sent over HTTPS (encrypted) — network sniffing blocked',
            note: '(relaxed to false on localhost for development)',
        },
        {
            label: 'SameSite',
            vulnerable: 'Lax',
            hardened: 'Strict',
            description: hasJsAccessibleToken
                ? 'Cookie sent on navigation, not cross-site POST — partial CSRF protection'
                : 'Cookie only sent with same-site requests — CSRF blocked',
        },
    ]

    // isSecure drives flag display — pending sessions are still actually hardened
    const isSecure = !hasJsAccessibleToken

    return (
        <Card sx={{
            gridColumn: { md: '1 / -1' },
            border: '1px solid',
            borderColor: isPending
                ? 'rgba(237,108,2,0.3)'
                : isVulnerable
                    ? 'rgba(231,76,60,0.3)'
                    : 'rgba(39,174,96,0.3)',
            bgcolor: isPending
                ? 'rgba(237,108,2,0.03)'
                : isVulnerable
                    ? 'rgba(231,76,60,0.03)'
                    : 'rgba(39,174,96,0.03)',
            transition: 'all 0.3s ease',
        }}>
            <CardContent sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <SecurityIcon sx={{
                        fontSize: 20,
                        color: isPending ? 'warning.main' : isVulnerable ? 'error.main' : 'success.main',
                    }} />
                    <Typography variant="h4" sx={{ fontSize: '0.9rem', fontWeight: 700 }}>
                        Session Inspector
                    </Typography>
                    <Chip
                        label={isPending ? 'PENDING LOGIN' : isVulnerable ? 'VULNERABLE' : 'HARDENED'}
                        size="small"
                        sx={{
                            ml: 'auto',
                            height: 22,
                            bgcolor: isPending
                                ? 'rgba(237,108,2,0.12)'
                                : isVulnerable
                                    ? 'rgba(231,76,60,0.12)'
                                    : 'rgba(39,174,96,0.12)',
                            color: isPending ? 'warning.main' : isVulnerable ? 'error.main' : 'success.main',
                            fontWeight: 700,
                            fontSize: '0.625rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                        }}
                    />
                </Box>

                {/* Pending: module set to vulnerable, session still hardened */}
                {pendingVulnerableLogin && (
                    <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem' }}>
                        Module set to Vulnerable — log out and back in for cookie flags to change.
                    </Alert>
                )}

                {/* Pending: module set to hardened, session still vulnerable */}
                {pendingHardenedLogin && (
                    <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem' }}>
                        Module set to Hardened, but the current session is still vulnerable. Log out and log back in to apply hardened cookie settings.
                    </Alert>
                )}

                {/* Cookie Flags Grid */}
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', letterSpacing: '0.08em' }}>
                    Cookie Flags
                </Typography>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                    gap: 1.5,
                    mt: 1,
                    mb: 2,
                }}>
                    {flags.map((flag) => {
                        const currentValue = isSecure ? flag.hardened : flag.vulnerable
                        return (
                            <Box key={flag.label} sx={{
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                        {flag.label}
                                    </Typography>
                                    <Chip
                                        label={String(currentValue)}
                                        size="small"
                                        sx={{
                                            height: 18,
                                            fontSize: '0.6rem',
                                            fontWeight: 700,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            bgcolor: isSecure ? 'rgba(39,174,96,0.12)' : 'rgba(231,76,60,0.12)',
                                            color: isSecure ? 'success.main' : 'error.main',
                                        }}
                                    />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', lineHeight: 1.3, display: 'block' }}>
                                    {flag.description}
                                </Typography>
                            </Box>
                        )
                    })}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Token Visibility */}
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', letterSpacing: '0.08em' }}>
                    Token Visibility
                </Typography>

                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* document.cookie */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}>
                        {jsAccessibleToken
                            ? <VisibleIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            : <HiddenIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        }
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                document.cookie
                            </Typography>
                            <Typography variant="body2" sx={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.72rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: jsAccessibleToken ? 'error.main' : 'text.disabled',
                            }}>
                                {jsAccessibleToken ? `token=${truncateToken(jsAccessibleToken)}` : '(empty — httpOnly)'}
                            </Typography>
                        </Box>
                        {jsAccessibleToken && (
                            <Tooltip title={copied ? 'Copied!' : 'Copy token'}>
                                <IconButton size="small" onClick={handleCopy}>
                                    <CopyIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>

                    {/* localStorage */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}>
                        {localStorageToken
                            ? <VisibleIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            : <HiddenIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        }
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                localStorage.token
                            </Typography>
                            <Typography variant="body2" sx={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.72rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: localStorageToken ? 'error.main' : 'text.disabled',
                            }}>
                                {localStorageToken ? truncateToken(localStorageToken) : '(empty — not stored)'}
                            </Typography>
                        </Box>
                        {localStorageToken && !jsAccessibleToken && (
                            <Tooltip title={copied ? 'Copied!' : 'Copy token'}>
                                <IconButton size="small" onClick={handleCopy}>
                                    <CopyIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>

                {/* Token storage summary */}
                <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', lineHeight: 1.4, display: 'block' }}>
                        {pendingVulnerableLogin
                            ? 'Cookie flags shown reflect your current session. Vulnerable flags will apply after your next login.'
                            : pendingHardenedLogin
                                ? 'Current session is still vulnerable. Hardened flags will apply after your next login.'
                                : hasJsAccessibleToken
                                ? '⚠️ Token is accessible via document.cookie and localStorage. An XSS payload like document.cookie can steal this session.'
                                : '✅ Token is stored in an HttpOnly cookie — invisible to JavaScript. XSS cannot steal this session.'
                        }
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    )
}
