// TODO:  Update Theme; clashes of colors w/Blue are poor in design; page does not feel accessible
// Decision: Do we want to differentiate between transfer, deposit, withdrawal?
    // It may help for testing vulnerabilities, so I have kept it for now.

// Dashboard was written independently, but informed by thematic implications from MUI official website to get styles on components
// Dasbhoard: https://mui.com/material-ui/getting-started/templates/ and https://medium.com/@codenova/understanding-usememo-in-react-3224b8447a76

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
import * as transactionsApi from '../api/transactions'


// Functions for History Page
export default function HistoryPage() {

    //Initialize
    const [transactions, setTransactions] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [searchParams] = useSearchParams()

    //add type --> deposit, transfer, withdrawal
    const typeFilter = searchParams.get('type')

    //Fetch Data
    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                const data = await transactionsApi.getTransactions(typeFilter)
                setTransactions(data)
            } catch (err) {
                console.error('Failed to load transactions:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [typeFilter])

    //helpers -- format Currency, date
    function formatCurrency(amount) {
        const prefix = amount >= 0 ? '+' : ''
        return `${prefix}${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount)}`
    }

    function formatDate(dateStr) {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric',
        })
    }

    //FE-based search in history; 
    //TODO: used memo placeholder to test search functions; will need to update to searching users 
    // and/or auto-generated descriptions as memos are not required information in db

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return transactions

        //sanitize query, search across fields (desc, type, date, amount, balance)
        const q = searchQuery.toLowerCase()
        return transactions.filter((txn) =>
            txn.description.toLowerCase().includes(q) ||
            txn.type.toLowerCase().includes(q) ||
            txn.date.includes(q) ||
            String(txn.amount).includes(q) ||
            String(txn.balanceAfter).includes(q)
        )
    }, [transactions, searchQuery])


    //When sent from Dashboard's "Transfer Amount", filter automatically for transfers
    const heading = typeFilter === 'transfers'
        ? 'Transfer History'
        : 'Transaction History'

    const subheading = typeFilter === 'transfers'
        ? 'All fund transfers from your account'
        : 'Complete activity log for your account'   

    //Can be updated for accessibility
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
           {/* Header: Heading Generated based on route to page */}
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

                {/* Input Field used in Search function */}
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

            {/* Full Table of Amounts to display values:  date, description, type, amount, balance */}
            {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} variant="rounded" height={48} />
                    ))}
                </Box>
                //Case:  No matches
            ) : filtered.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography color="text.secondary">No matches found</Typography>
                </Box>
            ) : (
                <>
                    <TableContainer component={Paper} elevation={0}
                        sx={{
                            bgcolor: 'background.paper',

                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                        }}
                    >
                        <Table size="small">
                            <TableHead>

                                {/* Table Headers */}
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell align="right">Balance</TableCell>
                                </TableRow>
                            </TableHead>

                        {/* Draft Rows via map: share date, descriptoin, type, amount, static balance */}
                        {/* As balance data is static, will need to be updated with API and DB */}
                            <TableBody>

                                {filtered.map((txn) => (
                                    // Craft our Row
                                    <TableRow
                                        key={txn.id}
                                        hover
                                        sx={{
                                            '&:last-child td': { borderBottom: 0 },
                                            transition: 'background 0.15s',
                                        }}
                                    >
                                    {/* Table Cells:  date, description, type, amount, balance */}
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                                {formatDate(txn.date)}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2">{txn.description}</Typography>
                                        </TableCell>

                                        {/* React Chip used for UI purpose */}
                                        <TableCell>
                                            <Chip
                                                label={typeLabel[txn.type] || txn.type}
                                                size="small"
                                                color={typeColor[txn.type] || 'default'}
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        </TableCell>

                                        {/* Ammount */}
                                        <TableCell align="right">
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    color: txn.amount >= 0 ? 'success.main' : 'error.main',
                                                }}
                                            >
                                                {formatCurrency(txn.amount)}
                                            </Typography>
                                        </TableCell>

                                        {/* Balance */}
                                        <TableCell align="right">
                                            <Typography
                                                variant="body2"
                                                sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary' }} >
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(txn.balanceAfter)}
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
