// VULN MODULE: Privilege Escalation (Broken Function Level Auth)
// R4.2.2: When privilege_escalation is OFF (hardened), enforces role-based access
// R4.2.1: When privilege_escalation is ON (vulnerable), skips the check — any  authenticated user can reach admin only routes
//         function-level authorization.

/**
 * Middleware to enforce that the authenticated user has a specific role (e.g. 'admin')
 * Reads the req.vuln_privilege_escalation flag (set by vulnerabilityToggle) to determine whether to enforce or bypass the check.
 *
 * @param {string} role - required role (e.g. 'admin')
 * @returns {Function} Express middleware
 * @requirement R4.2.1, R4.2.2
 */
function requireRole(role) {
    return (req, res, next) => {
        if (req.vuln_privilege_escalation) {
            // Vulnerability ON: skip role check, allowing any authenticated user to access
            return next();
        }

        if (!req.user || req.user.role !== role) {
            return res.status(403).json({
                error: {
                    status: 403,
                    message: 'Admin access required',
                    code: 'FORBIDDEN',
                },
            });
        }

        next();
    };
}

module.exports = { requireRole };
