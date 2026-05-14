import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
    Box,
    Typography,
    Alert,
    Card,
    CardContent,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Chip,
    Select,
    MenuItem,
    IconButton,
    Tooltip,
} from '@mui/material'
import { Check as CheckIcon } from '@mui/icons-material'
import * as adminApi from '../services/admin'

// AdminPage: renders at /admin
// VULN MODULE: Privilege Escalation (API5-Broken Function Level Auth)
// Vulnerable mode:  any authenticated user can view and modify all accounts.
// Hardened mode:    server enforces role='admin'; non-admins receive 403.

export default function AdminPage() {
    const { user } = useAuth()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [pendingRole, setPendingRole] = useState({}) // { [userId]: roleString }
    const [saving, setSaving] = useState({})           // { [userId]: boolean }
    const [saved, setSaved] = useState({})             // { [userId]: boolean }

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const { users: list } = await adminApi.listUsers()
            setUsers(list)
        } catch (err) {
            setError(err.message || 'Failed to load users.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    function handleRoleChange(userId, role) {
        setPendingRole((prev) => ({ ...prev, [userId]: role }))
        setSaved((prev) => ({ ...prev, [userId]: false }))
    }

    async function applyRoleChange(userId) {
        const role = pendingRole[userId]
        if (!role) return
        setSaving((prev) => ({ ...prev, [userId]: true }))
        try {
            const { user: updated } = await adminApi.changeUserRole(userId, role)
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)))
            setPendingRole((prev) => { const next = { ...prev }; delete next[userId]; return next })
            setSaved((prev) => ({ ...prev, [userId]: true }))
            setTimeout(() => setSaved((prev) => ({ ...prev, [userId]: false })), 2000)
        } catch (err) {
            setError(err.message || 'Failed to update role.')
        } finally {
            setSaving((prev) => ({ ...prev, [userId]: false }))
        }
    }

    return (
        <Box>
            <Typography variant="h1" sx={{ fontSize: '1.75rem', mb: 0.5 }}>
                Admin Panel
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                User management — visible to all authenticated users when Privilege Escalation is enabled.
            </Typography>

            {user?.role !== 'admin' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    You are logged in as <strong>{user?.role}</strong>. In hardened mode the server
                    blocks this page with 403. Enable the <em>Privilege Escalation</em> module to
                    bypass function-level authorization.
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Card>
                <CardContent sx={{ p: 0 }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Username</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Current Role</TableCell>
                                    <TableCell>Change Role</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((u) => {
                                    const pending = pendingRole[u.id]
                                    const isSaving = saving[u.id]
                                    const isDirty = pending !== undefined && pending !== u.role
                                    return (
                                        <TableRow key={u.id} hover>
                                            <TableCell sx={{ fontFamily: 'monospace' }}>
                                                {u.username}
                                            </TableCell>
                                            <TableCell>{u.email}</TableCell>
                                            <TableCell>{u.name || '—'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={u.role}
                                                    size="small"
                                                    color={u.role === 'admin' ? 'error' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    size="small"
                                                    value={pending ?? u.role}
                                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                    sx={{ minWidth: 100 }}
                                                >
                                                    <MenuItem value="user">user</MenuItem>
                                                    <MenuItem value="admin">admin</MenuItem>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                {saved[u.id] ? (
                                                    <CheckIcon color="success" fontSize="small" />
                                                ) : (
                                                    <Tooltip title={isDirty ? 'Apply role change' : 'No change'}>
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                disabled={!isDirty || isSaving}
                                                                onClick={() => applyRoleChange(u.id)}
                                                            >
                                                                {isSaving
                                                                    ? <CircularProgress size={16} />
                                                                    : <CheckIcon fontSize="small" />}
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </Box>
    )
}
