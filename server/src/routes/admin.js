// VULN MODULE: Privilege Escalation (Broken Function Level Auth)
// R4.2.1: vulnerability ON  → requireRole is present but skips its check; any user can access admin endpoints
// R4.2.2: vulnerability OFF → requireRole enforces 'admin' role; non-admins get 403

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { vulnerabilityToggle } = require('../middleware/vulnerabilityToggle');
const { requireRole } = require('../middleware/requireRole');
const adminController = require('../controllers/adminController');

// authenticate → set vuln flag → requireRole - reads flag to enforce or bypass
router.get(
    '/users',
    authenticate,
    vulnerabilityToggle('privilege_escalation'),
    requireRole('admin'),
    adminController.listUsers
);

router.get(
    '/users/:id',
    authenticate,
    vulnerabilityToggle('privilege_escalation'),
    requireRole('admin'),
    adminController.getUserById
);

router.patch(
    '/users/:id/role',
    authenticate,
    vulnerabilityToggle('privilege_escalation'),
    requireRole('admin'),
    adminController.changeUserRole
);

module.exports = router;
