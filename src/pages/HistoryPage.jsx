import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Skeleton,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import * as transfersApi from '../services/transfers'
import { normalizeTransaction } from '../utils/normalize'
import { fmt, formatDate } from '../utils/format'
import { useVulnerabilities } from '../hooks/useVulnerabilities'

// HistoryPage: renders at /history
// Fetch transfer history from GET /transfers on mount; re-fetches when URL ?type param changes
// On success: table populates with normalised transaction rows; search filters client-side
// On failure: table stays empty; error logged to console (silent fail)
// useMemo reference: https://medium.com/@codenova/understanding-usememo-in-react-3224b8447a76
export default function HistoryPage() {

    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchParams, setSearchParams] = useSearchParams()
    const urlSearchQuery = searchParams.get('q') || ''
    const [searchQuery, setSearchQuery] = useState(urlSearchQuery)

    // VULN MODULE: SQL Injection (a03-injection-sql) -- server-side memo search
    // URL ?memo= drives a GET /transfers?memo=... call; the existing client-side
    // search (?q=) remains untouched and continues to filter the rendered table.
    const memoParam = searchParams.get('memo') || ''
    const [serverSearchInput, setServerSearchInput] = useState(memoParam)

    //Vulnerability Module: Stored XSS - when enabled, the description cell wil render raw HTML
    const { modules } = useVulnerabilities()
    const xssVulnerable = modules.find(m => m.id === 'xss_stored')?.enabled

    // VULN MODULE: Reflected XSS — when enabled, search query renders as raw HTML
    const xssReflectedVulnerable = modules.find(m => m.id === 'xss_reflected')?.enabled
 //   const weakSessionVulnerable = modules.find(m => m.id === 'weak_session_tokens')?.enabled  -- placedholder awaiting merge

    // Educational notification state set by the reflected XSS detection effect
    const shouldShowNotification = !!xssReflectedVulnerable && !!searchQuery && /<[^>]+>/.test(searchQuery)
    const [notificationDismissed, setNotificationDismissed] = useState(false)

    // Keep search box in sync w/URL-driven demo links, inc repeated phishing-link
    const [prevURLQuery, setPrevUrlQuery] = useState(urlSearchQuery)
    if (prevURLQuery !== urlSearchQuery) {
        setPrevUrlQuery(urlSearchQuery)
        setSearchQuery(urlSearchQuery)
        setNotificationDismissed(false)
    }

    // Reflected XSS detection: fires when module is enabled and search query contains HTML
    const xssNotification = useMemo(() => {
        if (!shouldShowNotification || notificationDismissed) return null

        const cookie = document.cookie
        const tokenMatch = cookie.match(/token=([^;]+)/)

        if (tokenMatch) {
            return {
                severity: 'error',
                title: 'Reflected XSS: Attack Succeeded',
                message: `As a result of a Reflected XSS attack, your session token "${tokenMatch[1].substring(0, 25)}..." could have been sent to a third party.`,
            }
        }
        return {
            severity: 'warning',
            title: 'Reflected XSS: Attack Blocked',
            message: 'A Reflected XSS attack attempted to steal your session token, but it appears as empty. You are protected by FauxVault\'s hardening on session tokens.',
        }
    }, [shouldShowNotification, notificationDismissed])

    useEffect(() => {
        if (!shouldShowNotification) return
        const pageEl = document.getElementById('history-page')
        if (pageEl) {
            pageEl.style.transition = 'box-shadow 0.3s ease'
            pageEl.style.boxShadow = 'inset 0 0 0 3px rgba(231, 76, 60, 0.6)'
            setTimeout(() => { pageEl.style.boxShadow = 'none' }, 1500)
        }
    }, [shouldShowNotification])

    const typeFilter = searchParams.get('type')

    // Fetch on mount and when URL type or memo param changes
    // Only 'sent' and 'received' are recognized by the server; other values fetch all
    // When ?memo= is present, the server applies its own ILIKE filter (parameterized
    // in hardened mode; string-concatenated when sql_injection toggle is on).
    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                const serverType = ['sent', 'received'].includes(typeFilter) ? typeFilter : null
                const raw = await transfersApi.getTransfers(serverType, memoParam || null)
                const normalized = (raw.transactions ?? []).map(normalizeTransaction)
                setTransactions(normalized)
            } catch (err) {
                console.error('Failed to load transaction history:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [typeFilter, memoParam])

    // Debounce the server-search input → URL ?memo= so each keystroke does not fire
    // a fresh server request. replace:true keeps browser history clean.
    useEffect(() => {
        const handle = setTimeout(() => {
            const next = new URLSearchParams(searchParams)
            if (serverSearchInput) {
                next.set('memo', serverSearchInput)
            } else {
                next.delete('memo')
            }
            if (next.toString() !== searchParams.toString()) {
                setSearchParams(next, { replace: true })
            }
        }, 300)
        return () => clearTimeout(handle)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverSearchInput])

    // Client-side search across description, type, date, and amount
    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return transactions
        const q = searchQuery.toLowerCase()
        return transactions.filter((txn) =>
            txn.description.toLowerCase().includes(q) ||
            txn.type.toLowerCase().includes(q) ||
            txn.date.includes(q) ||
            String(txn.amount).includes(q)
        )
    }, [transactions, searchQuery])

    // Heading changes based on how the user arrived at this page
    const heading = typeFilter === 'transfers' ? 'Transfer History' : 'Transaction History'
    const subheading = typeFilter === 'transfers'
        ? 'All fund transfers from your account'
        : 'Complete activity log for your account'

    const typeColor = {
        transfer: 'info',
    }

    const typeLabel = {
        transfer: 'Transfer',
    }

    return (
        <Box id="history-page">
            {/* Header: title and search input */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2,
                    mb: 3,
                }}
            >
                <Box>
                    <Typography variant="h1" sx={{ fontSize: '1.75rem', mb: 0.5 }}>
                        {heading}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {subheading}
                    </Typography>
                </Box>

                <TextField
                    id="transaction-search"
                    placeholder="Search by description, type, amount…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    sx={{ minWidth: 280 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {/* VULN MODULE: SQL Injection (a03-injection-sql) -- server-side memo search */}
            <Box sx={{ mb: 2 }}>
                <TextField
                    id="server-transaction-search"
                    placeholder="Find any transaction across the bank (server search)…"
                    value={serverSearchInput}
                    onChange={(e) => setServerSearchInput(e.target.value)}
                    size="small"
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />
                {memoParam && (
                    <Typography
                        id="server-search-banner"
                        variant="caption"
                        color="warning.main"
                        sx={{ mt: 0.5, display: 'block' }}
                    >
                        Server search active for memo: "{memoParam}"
                    </Typography>
                )}
            </Box>

            {!loading && searchQuery && (
                <Typography variant="caption" color="text.disabled" sx={{ mb: 2, display: 'block' }}>
                    {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} found
                    {xssReflectedVulnerable
                        ? <span dangerouslySetInnerHTML={{ __html: ` matching "${searchQuery}"` }} />
                        : ` matching "${searchQuery}"`
                    }
                </Typography>
            )}

            {/* Loading: skeleton rows */}
            {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} variant="rounded" height={48} />
                    ))}
                </Box>

                /* No results */
            ) : filtered.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography color="text.secondary">No matches found</Typography>
                </Box>

                /* Table */
            ) : (
                <>
                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                        }}
                    >
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {filtered.map((txn) => (
                                    <TableRow
                                        key={txn.id}
                                        hover
                                        sx={{
                                            '&:last-child td': { borderBottom: 0 },
                                            transition: 'background 0.15s',
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                                {formatDate(txn.date)}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            {/* Vulnerability Module: Stored XSS - dagenouslySetInnerHTML when vulnerable */}
                                            {xssVulnerable
                                                ? <Typography variant="body2" dangerouslySetInnerHTML={{ __html: txn.description }} />
                                                : <Typography variant="body2">{txn.description}</Typography>
                                            }
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                label={typeLabel[txn.type] || txn.type}
                                                size="small"
                                                color={typeColor[txn.type] || 'default'}
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        </TableCell>

                                        <TableCell align="right">
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    color: txn.amount >= 0 ? 'success.main' : 'error.main',
                                                }}
                                            >
                                                {txn.amount >= 0 ? `+${fmt(txn.amount)}` : fmt(txn.amount)}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {!searchQuery && (
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>
                            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} found
                        </Typography>
                    )}
                </>
            )}

            {/* VULN MODULE: Reflected XSS — educational notification dialog */}
            <Dialog
                open={Boolean(xssNotification)}
                onClose={() => setNotificationDismissed(true)}
                id="xss-reflected-notification"
            >
                <DialogTitle sx={{ color: xssNotification?.severity === 'error' ? 'error.main' : 'warning.main' }}>
                    {xssNotification?.title}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {xssNotification?.message}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNotificationDismissed(true)} color="inherit">
                        Dismiss
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
