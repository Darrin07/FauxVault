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

//Helper Function - Gives Currency Format
function fmt(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(amount ?? 0)
}

function TransferModal({ isOpen, onClose }) {
    const [form, setForm] = useState({ recipientID: '', amount: '', memo: ''})
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    function handleChange(field) {
        return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }

    function resetForm() {
        setForm({ recipientID: '', amount: '', memo: ''})
        setError('')
        setSuccess('')
    }

    function handleClose() {
        resetForm()
        onClose()
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setSuccess('')

    if (!form.recipientId.trim()) {
        setError('Recipient Account ID is required')
        return
    }
    if (!form.amount || Number(form.amount) <= 0) {
        setError('Invalid Amount')
        return
    }

    setLoading(true)
    try {
        const { transfer } = await transfersApi.sendTransfer({
            recipientId: form.recipientId,
            amount: Number(form.amount),
            memo: form.memo,
        })
        setSuccess(`Successfully transferred $${transfer.amount.toFixed(2)} to ${transfer.recipientName}`)
        setForm({ recipientId: '', amount: '', memo: '' })
    } catch (err) {
        setError(err.message || 'Transfer failed')
    } finally {
        setLoading(false)
    }
}

return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Transfer Funds</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success" icon={<CheckIcon />}>{success}</Alert>}

                <TextField
                    id="transfer-recipient"
                    label="Recipient Account ID"
                    value={form.recipientId}
                    onChange={handleChange('recipientId')}
                    placeholder="e.g. 00287"
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <HashIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />
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


/* ── Dashboard Page ── */
export default function DashboardPage() {
    const [balance, setBalance] = useState(null)
    const [deposits, setDeposits] = useState(null)
    const [withdrawals, setWithdrawals] = useState(null)
    const [showTransfer, setShowTransfer] = useState(false)
    const navigate = useNavigate()

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
            } catch (err) {
                console.error('Failed to load dashboard data:', err)
            }
        }
        fetchData()
    }, [])

    const updatedLabel = balance?.lastUpdated
        ? `last updated ${new Date(balance.lastUpdated).toLocaleDateString() === new Date().toLocaleDateString() ? 'today' : new Date(balance.lastUpdated).toLocaleDateString()}`
        : ''

    return (
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
                {/* Balance card */}
                <Card
                    sx={{
                        gridColumn: { md: '1 / -1' },
                        background: 'linear-gradient(135deg, rgba(108,92,231,0.15) 0%, rgba(231,76,60,0.08) 100%)',
                        border: '1px solid rgba(108,92,231,0.2)',
                    }}
                >
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <BalanceIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary">
                                Current balance
                            </Typography>
                        </Box>
                        {balance ? (
                            <>
                                <Typography
                                    variant="h1"
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
                            </>
                        ) : (
                            <>
                                <Skeleton variant="text" width={200} height={48} />
                                <Skeleton variant="text" width={140} />
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Stat cards */}
                <Card>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <DepositIcon sx={{ fontSize: 18, color: 'success.main' }} />
                            <Typography variant="body2" color="text.secondary">
                                Total deposits this month
                            </Typography>
                        </Box>
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

                <Card>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <WithdrawalIcon sx={{ fontSize: 18, color: 'error.main' }} />
                            <Typography variant="body2" color="text.secondary">
                                Total withdrawals this month
                            </Typography>
                        </Box>
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

                {/* Quick actions */}
                <Card sx={{ gridColumn: { md: '1 / -1' } }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h4" sx={{ fontSize: '0.9rem', mb: 2 }}>
                            Quick actions
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Button
                                variant="outlined"
                                startIcon={<SendIcon />}
                                onClick={() => setShowTransfer(true)}
                            >
                                Transfer funds
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<HistoryIcon />}
                                onClick={() => navigate('/history?type=transfers')}
                            >
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
