import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box,
    Typography,
    Card,
    CardContent,
    Skeleton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    InputAdornment,
    Alert,
    CircularProgress,
    Divider,
} from '@mui/material'

import {
    Send as SendIcon,
    History as HistoryIcon,
    AccountBalance as BalanceIcon,
    TrendingUp as DepositIcon,
    TrendingDown as WithdrawalIcon,
    Tag as HashIcon,
    AttachMoney as DollarIcon,
    ChatBubbleOutlined as MemoIcon,
    CheckCircleOutlined as CheckIcon,
} from '@mui/icons-material'
import * as accountsApi from '../api/accounts'
import * as transfersApi from '../api/transfers'

// Page should allow users to see an overview of their pages
// Dashboard was written independently, but informed by thematic implications from MUI official website to get styles on components
// Dasbhoard: https://mui.com/material-ui/getting-started/templates/
// TODO:  Test outside of static datea

//Helper Function for currency - Gives Currency Format
function fmt(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(amount ?? 0)
}

//Modal for transfering funds: functions to open form on click, submit information, handle errors,
//reset form on close (cancel or submission)
function TransferModal({ isOpen, onClose }) {

    // Initialize with useState to manage
    const [form, setForm] = useState({ recipientID: '', amount: '', memo: ''})
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    // Helper function to handle changes within fields and setting values
    function handleChange(field) {
        return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }

    //Returns form to original state for additional uses 
    function resetForm() {
        setForm({ recipientID: '', amount: '', memo: ''})
        setError('')
        setSuccess('')
    }

    //Triggers resetting the form before closing
    function handleClose() {
        resetForm()
        onClose()
    }

    //Function handles submitting transfer funds to others
    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setSuccess('')

        //Error case:  ID is not present 
    if (!form.recipientId.trim()) {
        setError('Recipient Account ID is required')
        return
    }

        //Error case: adding negative numbers; may be case for exploitation later, will hardened as default
    if (!form.amount || Number(form.amount) <= 0) {
        setError('Invalid Amount')
        return
    }

    //otherwise, attempt to load
    setLoading(true)
    try {

        // attempts to send information to API over information
        const { transfer } = await transfersApi.sendTransfer({
            recipientId: form.recipientId,
            amount: Number(form.amount),
            memo: form.memo,
        })

        //case:  success
        setSuccess(`Successfully transferred $${transfer.amount.toFixed(2)} to ${transfer.recipientName}`)
        setForm({ recipientId: '', amount: '', memo: '' })

        //case: error
    } catch (err) {
        setError(err.message || 'Transfer failed')
    } finally {
        setLoading(false)
    }
}

    //Build the Buttons for Transferring Funds and Form 
return (

    //Transfer Funds Button -> Form
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Transfer Funds</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success" icon={<CheckIcon />}>{success}</Alert>}

                {/* Form - Recipient Field */}
                <TextField
                    id="transfer-recipient"
                    label="Recipient Account ID"
                    value={form.recipientId}
                    onChange={handleChange('recipientId')}
                    placeholder="e.g. 00777"
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <HashIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />

                {/* Form - Amount Field */}
                <TextField
                    id="transfer-amount"
                    label="Amount ($)"
                    type="number"
                    value={form.amount}
                    onChange={handleChange('amount')}
                    placeholder="0.00"
                    inputProps={{ min: '0.01', step: '0.01' }}
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <DollarIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />

                {/* Form - Memo Field */}
                <TextField
                    id="transfer-memo"
                    label="Memo (optional)"
                    value={form.memo}
                    onChange={handleChange('memo')}
                    placeholder="What's this for?"
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <MemoIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </DialogContent>

            {/* Form - Cancel Link/Button, Submit Button; handleClose() to reset form after click */}
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleClose} color="inherit">Cancel</Button>
                <Button type="submit" variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
                    {loading ? 'Sending…' : 'Send Transfer'}
                </Button>
            </DialogActions>
        </Box>
    </Dialog>
)
}


// Layout the dashboard page
export default function DashboardPage() {

    // Initialize values from useState
    const [balance, setBalance] = useState(null)
    const [deposits, setDeposits] = useState(null)
    const [withdrawals, setWithdrawals] = useState(null)
    const [showTransfer, setShowTransfer] = useState(false)
    const navigate = useNavigate()

    //Call API for information on our user
    //UPDATE AFTER API
    useEffect(() => {
        async function fetchData() {
            try {
                const [bal, dep, wdr] = await Promise.all([
                    accountsApi.getBalance(),
                    accountsApi.getDeposits(),
                    accountsApi.getWithdrawals(),
                ])
                setBalance(bal)
                setDeposits(dep)
                setWithdrawals(wdr)

                //error case no data
            } 
            catch (err) {
                console.error('Failed to load dashboard data:', err)
            }
        }

        fetchData()

    }, [])

    //To update our balance label; adds last updated today 
    const updatedLabel = balance?.lastUpdated
        ? `last updated ${new Date(balance.lastUpdated).toLocaleDateString() === new Date().toLocaleDateString() ? 'today' : new Date(balance.lastUpdated).toLocaleDateString()}`
        : ''

    return (

        //Title of Dashboard, grid for spacing, balance card on top, cards below for more detail
        <Box>
            <Typography variant="h1" sx={{ fontSize: '1.75rem', mb: 3 }}>
                Dashboard
            </Typography>

            {/* Grid */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 3,
                }}
            >
                {/* Current Balance card - on top */}
                <Card
                    sx={{
                        gridColumn: { md: '1 / -1' },
                        background: 'linear-gradient(135deg, rgba(108,92,231,0.15) 0%, rgba(231,76,60,0.08) 100%)',
                        border: '1px solid rgba(108,92,231,0.2)',
                    }}
                >
                    {/* Balance Content */}
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <BalanceIcon sx={{ fontSize: 20, color: 'primary.main' }} />

                            <Typography variant="body2" color="text.secondary">
                                Current balance
                            </Typography>

                        </Box>
                        {/* Amount or nothing */}
                        {balance ? (
                            <>
                                <Typography variant="h1"
                                    sx={{
                                        fontSize: '2.5rem',
                                        fontWeight: 800,
                                        mb: 0.5,
                                        fontFamily: "'JetBrains Mono', monospace",
                                    }}
                                >
                                    {fmt(balance.balance)}
                                </Typography>

                                <Typography variant="caption" color="text.disabled">
                                    {balance.accountType}{updatedLabel ? ` — ${updatedLabel}` : ''}
                                </Typography>

                            </>) : (
                            <>
                                <Skeleton variant="text" width={200} height={48} />
                                <Skeleton variant="text" width={140} />
                            </>
                        )}
                    </CardContent>

                </Card>

                {/* Stat Cards (for viewing security exploits) - should align central w/current balance */}
                {/* Deposit Card */}
                <Card>
                    {/* Deposit Icon +  Title */}
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <DepositIcon sx={{ fontSize: 18, color: 'success.main' }} />
                            <Typography variant="body2" color="text.secondary">
                                Deposits this Month
                            </Typography>
                        </Box>

                        {/* Get Amount or nothing */}
                        {deposits ? (
                            <Typography
                                variant="h3"
                                sx={{
                                    color: 'success.main',
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}
                            >
                                {fmt(deposits.total)}
                            </Typography>
                        ) : (
                            <Skeleton variant="text" width={120} height={36} />
                        )}
                    </CardContent>
                </Card>

                {/* withdrawal Icon +  Title */}
                <Card>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>

                            <WithdrawalIcon sx={{ fontSize: 18, color: 'error.main' }} />
                            <Typography variant="body2" color="text.secondary">
                                Total withdrawals this month
                            </Typography>

                        </Box>

                        {/* Amount or nothing */}
                        {withdrawals ? (
                            <Typography
                                variant="h3"
                                sx={{
                                    color: 'error.main',
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}
                            >
                                {fmt(withdrawals.total)}
                            </Typography>
                        ) : (
                            <Skeleton variant="text" width={120} height={36} />
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions Card (Transfer Runds, Send to Transaction History) */}
                <Card sx={{ gridColumn: { md: '1 / -1' } }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h4" sx={{ fontSize: '0.9rem', mb: 2 }}>
                            Quick actions
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>

                            {/* Transfer Funds Button */}
                            <Button
                                variant="outlined"
                                startIcon={<SendIcon />}
                                onClick={() => setShowTransfer(true)}>
                            Transfer funds
                            </Button>


                            {/* Transaction History Button - Navigates to page*/}
                            <Button
                                variant="outlined"
                                startIcon={<HistoryIcon />}
                                onClick={() => navigate('/history?type=transfers')}>
                            Transaction history
                            </Button>
                        </Box>
                        
                    </CardContent>
                </Card>
            </Box>

            <TransferModal
                isOpen={showTransfer}
                onClose={() => setShowTransfer(false)}
            />
        </Box>
    )

}
