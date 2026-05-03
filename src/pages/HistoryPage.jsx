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
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import * as transfersApi from '../services/transfers'
import { normalizeTransaction } from '../utils/normalize'
import { fmt, formatDate } from '../utils/format'

// HistoryPage: renders at /history
// Fetch transfer history from GET /transfers on mount; re-fetches when URL ?type param changes
// On success: table populates with normalised transaction rows; search filters client-side
// On failure: table stays empty; error logged to console (silent fail)
// useMemo reference: https://medium.com/@codenova/understanding-usememo-in-react-3224b8447a76
export default function HistoryPage() {

    const [transactions, setTransactions] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [searchParams] = useSearchParams()

    // 'transfers' when navigated from Dashboard quick action; controls heading only
    // Not forwarded to the API — the API filter accepts 'sent'/'received', not 'transfers'
    const typeFilter = searchParams.get('type')

    // Fetch on mount and when URL type param changes
    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                const raw = await transfersApi.getTransfers()
                const normalized = (raw.transactions ?? []).map(normalizeTransaction)
                setTransactions(normalized)
            } catch (err) {
                console.error('Failed to load transaction history:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [typeFilter])

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
        deposit: 'success',
        withdrawal: 'error',
        transfer: 'info',
    }

    const typeLabel = {
        deposit: 'Deposit',
        withdrawal: 'Withdrawal',
        transfer: 'Transfer',
    }

    return (
        <Box>
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
                                            <Typography variant="body2">{txn.description}</Typography>
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

                    <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>
                        {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} found
                        {searchQuery && ` matching "${searchQuery}"`}
                    </Typography>
                </>
            )}
        </Box>
    )
}
