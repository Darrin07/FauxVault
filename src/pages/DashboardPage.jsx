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
    Divider, } from '@mui/material'
import { 
    Send as SendIcon, 
    History as HistoryIcon, 
    AccountBalance as BalanceIcon, 
    TrendingUp as DepositIcon, 
    TrendingDown as WithdrawalIcon, 
    Tag as HashIcon, 
    AttachMoney as DollarIcon, 
    ChatBubbleOutlined as MemoIcon, 
    CheckCircleOutlined as CheckIcon, } from '@mui/icons-material'
import * as accountsApi from '../services/accounts'
import * as transfersApi from '../services/transfers'
import { fmt } from '../utils/format'

    // DashboardPage — rendered at /dashboard
    // Loads account balance, deposits, and withdrawals on mount via Promise.all
    // On success: balance, deposit, and withdrawal cards populate with live data
    // On failure: cards remain as MUI Skeletons; error is logged to console (silent fail)
    // // Dashboard informed by MUI templates: https://mui.com/material-ui/getting-started/templates/

//TransferModal: dialog for sending funds to another account
// Opens on "Transfer funds" click; resets form on close or after cancel
// On Success: green Alert confirms amount and destination; amount/ID fields clear; memo clears
// On Failure: red Alert shows server message (e.g. "Insufficient funds"); all fields stay populated

function TransferModal({ isOpen, onClose }) {
    const [form, setForm] = useState({ toAccountId: '', amount: '', memo: '' }) 
    const [loading, setLoading] = useState(false) 
    const [success, setSuccess] = useState('') 
    const [error, setError] = useState('')

    function handleChange(field) {
        return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
    // Returns form to its original empty state 
    function resetForm() {
        setForm({ toAccountId: '', amount: '', memo: '' })
        setError('')
        setSuccess('')
    }
    // Reset before closing so next open starts clean
    function handleClose() {
        resetForm()
        onClose()
    }
    
    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setSuccess('')
            
        // Validation: amount must be a positive number 
        if (!form.amount || Number(form.amount) <= 0) { 
            setError('Please enter a valid amount') 
            return 
        }

        // Validation: recipient account ID required 
        if (!form.toAccountId.trim()) { 
            setError('Recipient Account ID is required') 
            return 
        }

        setLoading(true) 
        try {
        const { transaction } = await transfersApi.sendTransfer({ 
            toAccountId: form.toAccountId, 
            amount: Number(form.amount), 
            memo: form.memo, })
            setSuccess('Successfully transferred!')
            setForm((prev) => ({ ...prev, toAccountId: '', memo: ''}))
        } catch (err) { 
            setError(err.message || 'Transfer failed. Please try again.') 
        } 
        finally { 
            setLoading(false) 
        }
    }

        return (
            <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth> 
                <DialogTitle sx={{ fontWeight: 700 }}>Transfer Funds</DialogTitle> 
                    <Box component="form" onSubmit={handleSubmit}> 
                        <DialogContent sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: 2, 
                                pt: 1 }}> 
                                {error && <Alert severity="error">{error}</Alert>} 
                                {success && <Alert severity="success" icon={<CheckIcon />}>{success}</Alert>}
   
                            {/* Recipient Account ID */} 
                            <TextField 
                                id="transfer-recipient" 
                                label="Recipient Account ID" 
                                value={form.toAccountId} 
                                onChange={handleChange('toAccountId')} 
                                placeholder="e.g. 660e8400-e29b-41d4-a716-446655440000" 
                                fullWidth 
                                InputProps={{ 
                                    startAdornment: (
                                    <InputAdornment position="start"> 
                                        <HashIcon sx={{ 
                                            fontSize: 18, 
                                            color: 'text.disabled' }} /> 
                                    </InputAdornment>), }} 
                            />
                                    
                            {/* Amount */} 
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
                                            <DollarIcon sx={{ 
                                                fontSize: 18, 
                                                color: 'text.disabled' }} /> 
                                        </InputAdornment>), }} 
                            />

                            {/* Memo (optional) */} 
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
                                            <MemoIcon sx={{ 
                                                fontSize: 18, 
                                                color: 'text.disabled' }} /> 
                                        </InputAdornment>), }} 
                            /> 
                        </DialogContent>

                    <DialogActions sx={{ 
                        px: 3, 
                        pb: 2 }}> 

                        <Button 
                            onClick={handleClose} 
                            color="inherit">
                                Cancel
                        </Button> 
                        <Button 
                            type="submit" 
                            variant="contained" 
                            disabled={loading}> 
                                {loading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null} 
                                {loading ? 'Sending…' : 'Send Transfer'} 
                        </Button> 
                    </DialogActions> 
                    </Box> 
            </Dialog>
        )
        }

    export default function DashboardPage() {

        const [balance, setBalance] = useState(null) 
        const [deposits, setDeposits] = useState(null) 
        const [withdrawals, setWithdrawals] = useState(null) 
        const [showTransfer, setShowTransfer] = useState(false) 
        const navigate = useNavigate()

        // Fetch all three data points in parallel on mount 
        useEffect(() => { async function fetchData() { 
            try { 
                // Promise.allSettled lets each call succeed or fail independently. 
                // // balance still loads — they don't drag each other down. 
                const [balResult, depResult, wdrResult] = await Promise.allSettled([ 
                    accountsApi.getBalance(), 
                    accountsApi.getDeposits(), 
                    accountsApi.getWithdrawals(), 
                ])

                if (balResult.status === 'fulfilled') setBalance(balResult.value) 
                else console.error('Balance failed:', balResult.reason)

                // false = endpoint responded but failed 
                // null = still in flight 
                setDeposits(depResult.status === 'fulfilled' ? depResult.value : false) 
                setWithdrawals(wdrResult.status === 'fulfilled' ? wdrResult.value : false) 
            } 
                catch (err) { 
                    console.error('Failed to load dashboard data:', err) 
                } 
            } 
            
        fetchData() 
    }, [])

    // Shows 'last updated today' or a date string based on the account's createdAt 
    const updatedLabel = balance?.lastUpdated 
        ? `last updated ${new Date(balance.lastUpdated).toLocaleDateString() === new Date().toLocaleDateString() 
            ? 'today' 
            : new Date(balance.lastUpdated).toLocaleDateString()}` 
            : ''
    
    return (
        <Box> 
            <Typography 
                variant="h1" 
                sx={{ 
                    fontSize: '1.75rem', 
                    mb: 3 }}> 
                Dashboard 
            </Typography>

        <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
                xs: '1fr', 
                md: '1fr 1fr' }, 
                gap: 3, }} 
        > 
        
            {/* Current Balance — spans full width */} 
            <Card sx={{ 
                gridColumn: { md: '1 / -1' }, 
                background: 'linear-gradient(135deg, rgba(108,92,231,0.15) 0%, rgba(231,76,60,0.08) 100%)', 
                border: '1px solid rgba(108,92,231,0.2)', }} 
            > 
                <CardContent sx={{ p: 3 }}> 
                    <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            mb: 1 }}> 
                        <BalanceIcon sx=
                            {{ fontSize: 20, 
                            color: 'primary.main' }} 
                        /> 
                        <Typography 
                            variant="body2" 
                            color="text.secondary"
                        > 
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
                                fontFamily: "'JetBrains Mono', monospace", }} 
                        > {fmt(balance.balance)} 
                        </Typography> 
                        <Typography 
                            variant="caption" 
                            color="text.disabled"> 
                            {balance.accountType}{updatedLabel ? ` — ${updatedLabel}` : ''} 
                        </Typography> 
                        </>
                    ) : (
                        <> 
                            <Skeleton 
                                variant="text" 
                                width={200} 
                                height={48} /> 
                            <Skeleton 
                                variant="text" 
                                width={140} /> 
                        </>
                    )} 
                </CardContent> 
            </Card>

            {/* Deposits this month */} 
            <Card> 
                <CardContent 
                    sx={{ p: 3 }}> 
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 1 }}> 
                        <DepositIcon 
                            sx={{ 
                                fontSize: 18, 
                                color: 'success.main' }} 
                        /> 
                        <Typography 
                            variant="body2" 
                            color="text.secondary"> 
                            
                            Deposits this month 
                        </Typography> 
                    </Box> 
                    
                    {deposits === null ? (
                        <Skeleton 
                            variant="text" 
                            width={120} 
                            height={36} 
                        />
                        ) : deposits === false ? (
                        <Typography 
                            variant="h3" 
                            sx={{ 
                                color: 'text.disabled', 
                                fontFamily: "'JetBrains Mono', monospace" }} 
                        > 
                        — 
                        </Typography>
                    ) : (
                        <Typography 
                            variant="h3" 
                            sx={{ 
                                color: 'success.main', 
                                fontFamily: "'JetBrains Mono', monospace" }} 
                        > 
                        {fmt(deposits.total)} 
                        </Typography>)} 
                    </CardContent> 
            </Card>

            {/* Withdrawals this month */} 
            <Card> 
                <CardContent 
                    sx={{ p: 3 }}> 
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 1 }}
                    > 
                        <WithdrawalIcon 
                            sx={{ 
                                fontSize: 18, 
                                color: 'error.main' }} 
                        /> 
                        <Typography 
                            variant="body2" 
                            color="text.secondary"
                        > 
                            Withdrawals this month 
                        </Typography> 
                    </Box> 
                    {withdrawals === null ? (
                        <Skeleton 
                            variant="text" 
                            width={120} 
                            height={36} 
                        />) 
                        : withdrawals === false ? (
                            <Typography 
                                variant="h3" 
                                sx={{ 
                                    color: 'text.disabled', 
                                    fontFamily: "'JetBrains Mono', monospace" }} 
                            > 
                            — 
                            </Typography>
                        ) : (
                            <Typography 
                                variant="h3" 
                                sx={{ 
                                    color: 'error.main', 
                                    fontFamily: "'JetBrains Mono', monospace" }} 
                            > 
                                {fmt(withdrawals.total)} 
                            </Typography>)}
                </CardContent> 
            </Card>

            {/* Quick Actions */} 
            <Card 
                sx={{ 
                    gridColumn: { md: '1 / -1' } }}
            > 
                <CardContent 
                    sx={{ p: 3 }}> 
                    <Typography 
                        variant="h4" 
                        sx={{  
                            fontSize: '0.9rem', 
                            mb: 2 }}
                    > 
                        Quick actions 
                    </Typography> 
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            gap: 2, 
                            flexWrap: 'wrap' }}
                    > 
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
            onClose={() => setShowTransfer(false)} /> 
        </Box>
    )
}
