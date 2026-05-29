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
    Collapse,
} from '@mui/material'
import { Search as SearchIcon, ExpandMore, ExpandLess } from '@mui/icons-material'
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

    // Advanced Search panel: collapsible container for server-side memo search +
    // date range filter. Defaults to open if ?memo= is already in the URL so the
    // user lands with their search state visible.
    const [advancedOpen, setAdvancedOpen] = useState(Boolean(memoParam))
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')

    // Vulnerabile Module: Stored XSS - when enabled, the description cell wil render raw HTML
    const { modules } = useVulnerabilities()
    const xssVulnerable = modules.find(m => m.id === 'xss_stored')?.enabled

    // Vulnerable module: Reflected XSS — when enabled, search query renders as raw HTML
    const xssReflectedVulnerable = modules.find(m => m.id === 'xss_reflected')?.enabled

    // Vulnerable module: weak session tokens
    const weakSessionVulnerable = modules.find(m => m.id === 'weak_session_tokens')?.enabled

    // Educational notification state set by the reflected XSS detection effect
    const [notificationDismissed, setNotificationDismissed] = useState(false)

    // hasXSSPayload: true whenever the URL param contains HTML — drives all XSS notification scenarios
    const hasXSSPayload = !!urlSearchQuery && /<[^>]+>/.test(urlSearchQuery)

    // Keep search box in sync w/URL-driven demo links, inc repeated phishing-link
    const [prevURLQuery, setPrevUrlQuery] = useState(urlSearchQuery)
    if (prevURLQuery !== urlSearchQuery) {
        setPrevUrlQuery(urlSearchQuery)
        setSearchQuery(urlSearchQuery)
        setNotificationDismissed(false)
    }

    // Reflected XSS detection: fires when module is enabled and search query contains HTML
    const xssNotification = useMemo(() => {
        if (!hasXSSPayload || notificationDismissed) return null

        // Scenario 1: XSS hardened: payload was rendered as literal text, attack could not execute
        if (!xssReflectedVulnerable) {
            return {
                severity: 'success',
                title: 'Reflected XSS: Attack Blocked',
                message: 'The phishing link contained an XSS payload, but the app is hardened against Reflected XSS. The payload was rendered as literal text in the top-right of the window rather than executed.',
            }
        }

        // XSS is vulnerable: payload executed (you see the alert()). Check what JavaScript can actually read.
        const cookieToken = document.cookie
            .split(';')
            .map(c => c.trim())
            .find(c => c.startsWith('token='))
            ?.split('=')
            ?.[1]
        const localStorageToken = localStorage.getItem('token')
        const readableToken = cookieToken || localStorageToken

        // Scenario 3: Chain attack — XSS executed and the session token is JS-readable.
        // Cookie flags are applied at login time, so actual token visibility is the source of truth.
        if (readableToken) {
            const chainMessage = weakSessionVulnerable
                ? `Both Reflected XSS and Weak Session Tokens are enabled. The XSS payload executed and your session token "${readableToken.substring(0, 25)}..." is readable from JavaScript. A real attacker could exfiltrate it.`
                : `The XSS payload executed and your current session token "${readableToken.substring(0, 25)}..." is still readable from JavaScript. Log out and back in after hardening Weak Session Tokens to apply protected cookie flags.`
            return {
                severity: 'error',
                title: 'Chain Attack Succeeded',
                message: chainMessage,
            }
        }

        // Scenario 2: XSS succeeded, no full chain yet
        return {
            severity: 'error',
            title: 'Reflected XSS: Attack Succeeded',
            message: 'The XSS payload in the URL executed as JavaScript (see the rendered alert()). Enable Weak Session Tokens alongside this module to simulate a common session-hijacking chain attack.',
        }
    }, [hasXSSPayload, notificationDismissed, xssReflectedVulnerable, weakSessionVulnerable])

    useEffect(() => {
        if (!hasXSSPayload) return
        const pageEl = document.getElementById('history-page')
        if (pageEl) {
            const color = xssReflectedVulnerable
                ? 'rgba(231, 76, 60, 0.6)'   // red: attack succeeded
                : 'rgba(39, 174, 96, 0.6)'    // green: attack blocked
            pageEl.style.transition = 'box-shadow 0.3s ease'
            pageEl.style.boxShadow = `inset 0 0 0 3px ${color}`
            setTimeout(() => { pageEl.style.boxShadow = 'none' }, 1500)
        }
    }, [hasXSSPayload, xssReflectedVulnerable])

    const typeFilter = searchParams.get('type')

    // Fetch on mount and when URL type or memo param changes
    // Only 'sent' and 'received' are recognized by the server; other values fetch all
    // When ?memo= is present, the server applies its own ILIKE filter (parameterized
    // in hardened mode; string-concatenated when sql_injection toggle is on).
    useEffect(() => {
        // Guard against stale resolutions: if the user types a new memo (or
        // unmounts) before the previous fetch returns, the stale flag suppresses
        // the late setState. Avoids setTransactions on an unmounted component
        // and avoids overwriting fresh results with an older response.
        let stale = false
        async function fetchData() {
            setLoading(true)
            try {
                const serverType = ['sent', 'received'].includes(typeFilter) ? typeFilter : null
                const raw = await transfersApi.getTransfers(serverType, memoParam || null)
                if (stale) return
                const normalized = (raw.transactions ?? []).map(normalizeTransaction)
                setTransactions(normalized)
            } catch (err) {
                if (stale) return
                console.error('Failed to load transaction history:', err)
            } finally {
                if (!stale) setLoading(false)
            }
        }
        fetchData()
        return () => { stale = true }
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

    // Advanced Search date range filter (client-side). Applies before the
    // client-side keyword search so combinations compose: "show me Coffee
    // transactions between Apr 1 and Apr 30" works without server changes.
    const filteredByDate = useMemo(() => {
        if (!fromDate && !toDate) return transactions
        return transactions.filter((txn) => {
            const txnDay = (txn.date || '').substring(0, 10)
            if (fromDate && txnDay < fromDate) return false
            if (toDate && txnDay > toDate) return false
            return true
        })
    }, [transactions, fromDate, toDate])

    // Client-side keyword search across description, type, date, and amount
    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return filteredByDate
        const q = searchQuery.toLowerCase()
        return filteredByDate.filter((txn) =>
            txn.description.toLowerCase().includes(q) ||
            txn.type.toLowerCase().includes(q) ||
            txn.date.includes(q) ||
            String(txn.amount).includes(q)
        )
    }, [filteredByDate, searchQuery])

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
                    label="Search transactions"
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

            {/* Advanced Search: collapsible panel housing server-side memo search
                (SQL Injection module surface) and client-side date range filter. */}
            <Box sx={{ mb: 2 }}>
                <Button
                    id="advanced-search-toggle"
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                    startIcon={<SearchIcon />}
                    endIcon={advancedOpen ? <ExpandLess /> : <ExpandMore />}
                    size="small"
                    sx={{ mb: 1 }}
                >
                    Advanced Search
                </Button>
                <Collapse in={advancedOpen}>
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 2,
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { sm: 'center' },
                            mb: 0.5,
                        }}
                    >
                        <TextField
                            id="server-transaction-search"
                            placeholder="Search by memo (across the bank)…"
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
                        <TextField
                            id="advanced-search-from-date"
                            type="date"
                            label="From"
                            aria-label="From date"
                            InputLabelProps={{ shrink: true }}
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            size="small"
                        />
                        <TextField
                            id="advanced-search-to-date"
                            type="date"
                            label="To"
                            aria-label="To date"
                            InputLabelProps={{ shrink: true }}
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            size="small"
                        />
                    </Box>
                    {memoParam && (
                        <Typography
                            id="server-search-banner"
                            variant="caption"
                            color="warning.main"
                            sx={{ display: 'block' }}
                        >
                            Server search active for memo: "{memoParam}"
                        </Typography>
                    )}
                </Collapse>
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

            ) : transactions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography color="text.secondary">No transactions yet</Typography>
                </Box>

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
                <DialogTitle sx={{ color: xssNotification?.severity === 'error' ? 'error.main' : xssNotification?.severity === 'success' ? 'success.main' : 'warning.main' }}>
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
