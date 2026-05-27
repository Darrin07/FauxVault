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
        owaspWeb: 'A01:2025 - Broken Access Control',
        owaspApi: 'API1:2023 - Broken Object Level Authorization',
        description:
            'BOLA occurs when an API endpoint accepts a user-controlled object ID but authorizes the request against the wrong identity. An authenticated user can supply another account UUID and read data that should belong only to that account owner.',
        howItWorks:
            'GET /api/accounts/:id accepts an account UUID. In vulnerable mode the server looks up the account owner from the requested ID, binds the RLS session to that owner, and returns the account with ownerId and vulnerableMode. In hardened mode cross-user reads return 404.',
        exploitHints: [
            'Log in and capture your auth cookie from the browser session.',
            'Find or guess another account UUID from seeded data or another API response.',
            'Request GET /api/accounts/<victim-account-uuid> while authenticated as your own user.',
            'In vulnerable mode, confirm the response exposes another account\'s balance plus ownerId and vulnerableMode.',
        ],
        mitigationHints: [
            'Bind database reads to the authenticated user, not to an ID supplied in the request.',
            'After loading an account, compare account.userId to req.user.userId before returning it.',
            'Return a generic 404 for cross-user reads so the endpoint does not confirm whether a UUID exists.',
            'Prefer non-sequential UUIDs over integer IDs to make enumeration impractical.',
        ],
        payloadExample: 'GET /api/accounts/00000000-0000-0000-0000-000000000000',
    },

    privilege_escalation: {
        owaspWeb: 'A01:2025 - Broken Access Control',
        owaspApi: 'API5:2023 - Broken Function Level Authorization',
        description:
            'Privilege escalation happens when a user can reach functionality reserved for a higher role. The UI may hide admin actions, but the server must still enforce the role on every admin endpoint.',
        howItWorks:
            'The admin routes use role middleware. When privilege_escalation is enabled, that middleware intentionally bypasses the admin-role check and lets any authenticated user call /api/admin/users, /api/admin/users/:id, and /api/admin/users/:id/role.',
        exploitHints: [
            'Log in as a regular user (not admin) and navigate directly to /admin in the browser.',
            'In vulnerable mode, confirm the page can load user management data.',
            'Call GET /api/admin/users with your normal authenticated browser session.',
            'Try PATCH /api/admin/users/:id/role with { "role": "admin" } to test whether role-changing functions are also exposed.',
        ],
        mitigationHints: [
            'Keep role-checking middleware on every admin route and fail closed when the role is not admin.',
            'Never rely on hidden frontend links as the access-control boundary.',
            'Return 403 Forbidden for authenticated users who do not have the required role.',
            'Keep an explicit access-control matrix: document which role is required for every endpoint.',
        ],
        payloadExample: 'PATCH /api/admin/users/<user-uuid>/role  { "role": "admin" }',
    },

    excessive_data_exposure: {
        owaspWeb: '',
        owaspApi: 'API3:2023 - Broken Object Property Level Authorization',
        description:
            'Excessive data exposure occurs when an API returns fields the client does not need. Mass assignment is the matching write-side problem: an endpoint accepts properties that the user should never control, such as an admin flag.',
        howItWorks:
            'In vulnerable mode, GET /api/accounts/me returns extra account and nested user fields, including userId, role, email, and passwordBcrypt. PUT /api/accounts/me accepts isAdmin:true and promotes the current user to admin.',
        exploitHints: [
            'Call GET /api/accounts/me and inspect the full JSON response, not just the fields shown in the UI.',
            'Look for nested user properties such as passwordBcrypt, role, email, and userId.',
            'Send PUT /api/accounts/me with { "isAdmin": true } in the request body.',
            'Refresh the app and check whether admin routes or role-dependent controls become available.',
        ],
        mitigationHints: [
            'Use Data Transfer Objects (DTOs), serialize only the specific fields each view needs.',
            'Validate all incoming request bodies against an allowlist schema; reject unknown fields like isAdmin.',
            'Never expose password hashes or role-management fields in ordinary account responses.',
            'Keep profile/account update endpoints scoped to user-editable fields such as name and email.',
        ],
        payloadExample: 'PUT /api/accounts/me  { "isAdmin": true }',
    },

    verbose_errors: {
        owaspWeb: 'A05:2025 - Security Misconfiguration',
        owaspApi: 'API8:2023 - Security Misconfiguration',
        description:
            'When a server returns stack traces, raw SQL queries, or internal file paths in its error responses, attackers receive a detailed map of the system\'s internals, revealing table names, column names, framework versions, and server paths that make targeted attacks far more precise.',
        howItWorks:
            'In vulnerable mode, the Express error handler adds debugging detail such as stack, detail, hint, and query text to the structured JSON error response. Hardened mode keeps the client response limited to status, message, and code.',
        exploitHints: [
            'Trigger a server error with a request that reaches the error handler, such as an unmatched test route in the API.',
            'Inspect the JSON error body for stack, detail, hint, or query fields.',
            'Use revealed table names, column names, and file paths to make follow-up attacks more precise.',
            'Compare the vulnerable response with hardened mode to confirm the extra diagnostic fields disappear.',
        ],
        mitigationHints: [
            'Return a structured but minimal client error response with status, message, and code.',
            'Log the full error detail server-side (to a file or logging service), never to the client.',
            'Set NODE_ENV=production to disable Express\'s default verbose error middleware.',
            'Remove the X-Powered-By header and any other framework fingerprinting headers.',
        ],
        payloadExample: 'GET /api/dummy-route',
    },

    weak_password_storage: {
        owaspWeb: 'A02:2025 - Cryptographic Failures',
        owaspApi: 'API2:2023 - Broken Authentication',
        description:
            'Storing passwords as plaintext or with weak, unsalted hashes (MD5, SHA-1) means a single database breach exposes every user\'s password, either directly or within seconds via precomputed rainbow tables. A breach that would be contained becomes a full credential dump.',
        howItWorks:
            'In vulnerable mode, registration keeps plaintext and MD5 password material alongside the bcrypt value and returns hashInfo to make the weakness visible in the demo. Hardened mode relies on bcrypt and does not expose weak password material in auth responses.',
        exploitHints: [
            'Register or log in while the module is vulnerable and inspect the response hashInfo.',
            'Query the users table directly and compare password_plaintext, password_md5, and password_bcrypt.',
            'A 32-character hex string is MD5 and can usually be cracked quickly for common passwords.',
            'Compare hash formats: MD5 is 32 hex chars, while bcrypt starts with $2b$ and includes its salt and cost.',
        ],
        mitigationHints: [
            'Use a slow password hashing algorithm such as bcrypt or Argon2id for password verification.',
            'bcrypt automatically generates and stores a unique salt per hash, never reuse salts.',
            'Never store passwords in plaintext, with fast unsalted hashes, or with reversible encryption.',
            'Do not return password hash diagnostics from production login or registration responses.',
        ],
        payloadExample: "POST /api/auth/login  { \"identifier\": \"test_user\", \"password\": \"Password123\" }",
    },

    sql_injection: {
        owaspWeb: 'A03:2025 - Injection',
        owaspApi: '',
        description:
            'SQL injection occurs when user input is concatenated directly into a SQL query string. An attacker can break out of the intended query context and read, modify, or delete arbitrary data, or bypass authentication entirely with a single carefully crafted string.',
        howItWorks:
            'This module is represented in the toggle list, but current main does not yet expose a working SQL injection route. The transaction history search is client-side filtering, and GET /api/transfers only accepts a type filter.',
        exploitHints: [
            'Do not treat the History page search box as a SQL injection target on current main.',
            'Use this page as a placeholder for the planned module until a backend route intentionally concatenates input.',
            'When implemented, test with a harmless single quote first and verify the vulnerable route is isolated from destructive database permissions.',
            'Keep demo payloads read-only so the training app remains recoverable.',
        ],
        mitigationHints: [
            'Use parameterized queries (prepared statements) for every database query, never concatenate user input.',
            'An ORM like Sequelize or Prisma automatically uses parameterized queries.',
            'Input validation is a secondary layer, not a primary defense, parameterization is the fix.',
            'Use a least-privilege DB account: the app role should not have DROP, CREATE, or GRANT permissions.',
        ],
        payloadExample: 'Planned demo payload: \' OR \'1\'=\'1',
    },

    xss_stored: {
        owaspWeb: 'A03:2025 - Injection',
        owaspApi: '',
        description:
            'Stored XSS occurs when user-supplied HTML is saved and later rendered without encoding. Every user who views the affected page can execute attacker-controlled browser code.',
        howItWorks:
            'Transfer memo/reference text is stored with the transaction. When xss_stored is enabled, the History page transaction description and Transfer page recent memo render that value with dangerouslySetInnerHTML.',
        exploitHints: [
            'Submit a transfer with an HTML event-handler payload in the memo field.',
            'Navigate to Transaction History and inspect whether the memo executes when rendered.',
            'Return to Transfer and check the recent-transfer memo rendering path too.',
            'Try payloads that do not rely on script tags, such as <img src=x onerror=alert(1)>.',
        ],
        mitigationHints: [
            "Use React's default JSX rendering, it auto-escapes all output. Avoid dangerouslySetInnerHTML.",
            'If rich HTML must be rendered, sanitize it with a library such as DOMPurify before display.',
            'Set a strict Content Security Policy (CSP) header to block inline scripts.',
            'Mark session cookies as HttpOnly so scripts cannot read them even if XSS succeeds.',
        ],
        payloadExample: '<img src=x onerror=alert(document.cookie)>',
    },

    xss_reflected: {
        owaspWeb: 'A03:2025 - Injection',
        owaspApi: '',
        description:
            'Reflected XSS injects a payload through a request or URL and immediately reflects it into a page without encoding. The victim must load the crafted request while authenticated for protected FauxVault pages.',
        howItWorks:
            'The History page reads the ?q= URL parameter and, when xss_reflected is enabled, renders the matching-search label with dangerouslySetInnerHTML. The transfer flow also echoes an invalid toAccountId in vulnerable mode, and TransferPage renders that server error as HTML.',
        exploitHints: [
            'While logged in, append an HTML payload to the search URL: /history?q=<img src=x onerror=alert(1)>.',
            'Use the phishing email button in the vulnerability panel to demonstrate link-based delivery.',
            'Submit a transfer with an invalid toAccountId containing markup and observe the reflected error path.',
            'Try URL-encoding the payload if the browser or tooling rewrites special characters.',
        ],
        mitigationHints: [
            'Never reflect URL parameters directly into the DOM, read them into React state and render with JSX.',
            "React's JSX rendering escapes all values by default; dangerouslySetInnerHTML bypasses this intentionally.",
            'A strict Content Security Policy (CSP) with nonce-based script allowlisting blocks most reflected XSS.',
            'Keep server validation errors generic; do not echo raw invalid values back into HTML-rendered UI.',
        ],
        payloadExample: '/history?q=<img src=x onerror=alert(document.cookie)>',
    },

    weak_session_tokens: {
        owaspWeb: 'A07:2025 - Identification and Authentication Failures',
        owaspApi: 'API2:2023 - Broken Authentication',
        description:
            'Weak session handling exposes tokens to theft or replay. Cookies without HttpOnly can be read by JavaScript, weaker SameSite settings increase cross-site risk, and returning tokens in response bodies makes them easier to leak.',
        howItWorks:
            'In vulnerable mode, login returns token in the JSON response and sets a cookie with HttpOnly=false, Secure=false, and SameSite=Lax. Hardened mode omits the body token and uses an HttpOnly cookie with SameSite=Strict; Secure is enabled in production.',
        exploitHints: [
            'Open DevTools -> Application -> Cookies and check the token cookie flags.',
            'Run document.cookie in the browser console, if the token appears, HttpOnly is absent.',
            'Inspect the login JSON response; in vulnerable mode it includes token, while hardened mode does not.',
            'Use the Session Inspector on the Dashboard to compare the live flag state after toggling the module.',
        ],
        mitigationHints: [
            'Set HttpOnly=true on all session cookies, JavaScript must never be able to read them.',
            'Set Secure=true in production so cookies are only transmitted over HTTPS.',
            'Set SameSite=Strict to prevent the cookie from being sent on cross-origin requests.',
            'Use a cryptographically random JWT secret of at least 256 bits.',
            'Do not return bearer tokens in response bodies when cookie-only auth is intended.',
        ],
        payloadExample: 'document.cookie  ->  reveals token value if HttpOnly is missing',
    },

    brute_force: {
        owaspWeb: 'A07:2025 - Identification and Authentication Failures',
        owaspApi: 'API4:2023 - Unrestricted Resource Consumption',
        description:
            'Without effective rate limiting, the login endpoint accepts too many password attempts from the same source. Automated scripts can turn weak or reused passwords into account compromise.',
        howItWorks:
            'POST /api/auth/login uses identifier and password. Hardened mode enforces the strict brute-force limiter: 5 login requests per 5 minutes per IP. Vulnerable mode skips that strict limiter, while an always-on auth safety net still caps all auth routes at 100 requests per minute per IP.',
        exploitHints: [
            'Use curl in a shell loop to submit rapid-fire login attempts with a wordlist.',
            'A list of the 100 most common passwords cracks most accounts with weak credentials.',
            'Compare hardened and vulnerable modes to see when the 5-per-5-minutes login limiter blocks requests.',
            'Use identifier, not username, in the login JSON body.',
        ],
        mitigationHints: [
            'Use express-rate-limit or equivalent middleware to cap login attempts per IP and time window; this app uses 5 attempts per 5 minutes.',
            'Keep a safety-net limiter active even when demonstrating weaker controls; this app also keeps a 100-per-minute auth cap.',
            'Use generic login failures so attackers cannot enumerate accounts.',
            'Log all failed login attempts and alert on suspicious volume from a single IP.',
        ],
        payloadExample:
            "for i in $(seq 1 50); do curl -sX POST /api/auth/login -H 'Content-Type: application/json' -d '{\"identifier\":\"test_user\",\"password\":\"pass'$i'\"}'; done",
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
                            {content.owaspWeb && <OwaspChip label={content.owaspWeb} />}
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
