import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Divider,
    Box,
} from '@mui/material'
import { Email as EmailIcon } from '@mui/icons-material'

// Single source of truth for the reflected XSS payload.  Imported by Vulnerability Panel for navigate() call
// so the string is never duplicated between the dialog and the URL construction.
export const XSS_REFLECTED_PAYLOAD = '<img src=x onerror="alert(\'XSS\')">'

// Simulates a phishing email that a real attacker would send to a victim.
// Props:
//   open          controls MUI Dialog visibility
//   onClose       called when the user dismisses the dialog
//   onClickLink   called when the user clicks the fake "Review" link;
//                 VulnerabilityPanel handles navigation to /history?q=<payload>
export default function PhishingEmailDialog({ open, onClose, onClickLink }) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            id="phishing-email-dialog"
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon fontSize="small" />
                Inbox — FauxVault Security
            </DialogTitle>

            <Divider />

            <DialogContent>
                {/* Email metadata */}
                <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">From:</Typography>
                    <Typography variant="body2">security-alerts@fauxvault-support.com</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Subject:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                        Unusual Activity Detected on Your Account
                    </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Email message */}
                <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
                    Dear FauxVault Customer,
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.8, mt: 1 }}>
                    We have detected unusual activity on your account. Please review your recent
                    transaction history immediately to verify no unauthorised transfers have been made.
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.8, mt: 2 }}>
                    {/* Navigates to /history?q=<payload> via onClickLink */}
                    <Button
                        id="phishing-link"
                        variant="text"
                        size="small"
                        onClick={onClickLink}
                        sx={{ p: 0, textTransform: 'none', textDecoration: 'underline' }}
                    >
                        Review Your Transaction History →
                    </Button>
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.8, mt: 2 }}>
                    FauxVault Security Team
                </Typography>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="inherit" size="small">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    )
}
