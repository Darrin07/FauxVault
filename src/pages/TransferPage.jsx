import { useState } from 'react'
import {
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    InputAdornment,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
} from '@mui/material'
import {
    Send as SendIcon,
    Tag as HashIcon,
    AttachMoney as DollarIcon,
    ChatBubbleOutlined as MemoIcon,
    CheckCircleOutlined as CheckIcon,
} from '@mui/icons-material'
import * as transfersApi from '../api/transfers'

export default function TransferPage() {
    const [form, setForm] = useState({ recipientId: '', amount: '', memo: '' })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(null)
    const [loading, setLoading] = useState(false)
    const [recentTransfers, setRecentTransfers] = useState([])

    function handleChange(field) {
        return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setSuccess(null)

        if (!form.recipientId.trim()) {
            setError('Please enter a recipient account ID')
            return
        }
        if (!form.amount || Number(form.amount) <= 0) {
            setError('Please enter a valid amount')
            return
        }

        setLoading(true)
        try {
            const { transfer } = await transfersApi.sendTransfer({
                recipientId: form.recipientId,
                amount: Number(form.amount),
                memo: form.memo,
            })
            setSuccess(transfer)
            setRecentTransfers((prev) => [transfer, ...prev].slice(0, 5))
            setForm({ recipientId: '', amount: '', memo: '' })
        } catch (err) {
            setError(err.message || 'Transfer failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box>
            <Typography variant="h1" sx={{ fontSize: '1.75rem', mb: 0.5 }}>
                Transfer Funds
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Send money to another FauxVault user
            </Typography>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: recentTransfers.length ? '1fr 1fr' : '1fr' },
                    gap: 3,
                    maxWidth: recentTransfers.length ? undefined : 600,
                }}
            >
                {/* Transfer form */}
                <Card>
                    <CardContent sx={{ p: 3 }}>
                        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {error && <Alert severity="error">{error}</Alert>}
                            {success && (
                                <Alert severity="success" icon={<CheckIcon />}>
                                    Successfully sent ${success.amount.toFixed(2)} to {success.recipientName}
                                </Alert>
                            )}

                            <TextField
                                id="transfer-page-recipient"
                                label="Recipient Account ID"
                                value={form.recipientId}
                                onChange={handleChange('recipientId')}
                                placeholder="Enter account ID (e.g. 00287)"
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
                                id="transfer-page-amount"
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
                                id="transfer-page-memo"
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

                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                                disabled={loading}
                                sx={{ mt: 1 }}
                            >
                                {loading ? 'Sending…' : 'Send Transfer'}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>

                {/* Recent transfers */}
                {recentTransfers.length > 0 && (
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h4" sx={{ fontSize: '0.9rem', mb: 2 }}>
                                Recent Transfers
                            </Typography>
                            <List disablePadding>
                                {recentTransfers.map((t) => (
                                    <ListItem
                                        key={t.id}
                                        disablePadding
                                        sx={{
                                            py: 1.5,
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                            '&:last-child': { border: 'none' },
                                        }}
                                    >
                                        <ListItemText
                                            primary={t.recipientName}
                                            secondary={t.date}
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                            secondaryTypographyProps={{ variant: 'caption' }}
                                        />
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 700,
                                                color: 'error.main',
                                                fontFamily: "'JetBrains Mono', monospace",
                                            }}
                                        >
                                            -${t.amount.toFixed(2)}
                                        </Typography>
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                )}
            </Box>
        </Box>
    )
}
