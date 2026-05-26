import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ModulePage from '../../pages/ModulePage'

const { mockNavigate, mockToggleModule, mockUseVulnerabilities, routeState } = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockToggleModule: vi.fn(),
    mockUseVulnerabilities: vi.fn(),
    routeState: { moduleId: 'bola' },
}))

const ALL_MODULES = [
    { id: 'bola', name: 'Broken Access Control', enabled: true },
    { id: 'weak_password_storage', name: 'Weak Password Storage', enabled: true },
    { id: 'sql_injection', name: 'SQL Injection', enabled: true },
    { id: 'xss_stored', name: 'Stored XSS', enabled: true },
    { id: 'xss_reflected', name: 'Reflected XSS', enabled: true },
    { id: 'verbose_errors', name: 'Verbose Errors', enabled: true },
    { id: 'weak_session_tokens', name: 'Weak Session Tokens', enabled: true },
    { id: 'brute_force', name: 'Brute Force', enabled: true },
    { id: 'excessive_data_exposure', name: 'Excessive Data Exposure', enabled: true },
    { id: 'privilege_escalation', name: 'Privilege Escalation', enabled: true },
]

vi.mock('../../hooks/useVulnerabilities', () => ({
    useVulnerabilities: mockUseVulnerabilities,
}))

vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ moduleId: routeState.moduleId }),
}))

vi.mock('@mui/material', () => ({
    Box: ({ children }) => <div>{children}</div>,
    Typography: ({ children }) => <span>{children}</span>,
    Chip: ({ label }) => <span>{label}</span>,
    Card: ({ children }) => <section>{children}</section>,
    CardContent: ({ children }) => <div>{children}</div>,
    Divider: () => <hr />,
    IconButton: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Switch: ({ checked, onChange }) => (
        <input type="checkbox" role="switch" checked={checked} onChange={onChange} />
    ),
    Tooltip: ({ children }) => <div>{children}</div>,
}))

vi.mock('@mui/icons-material', () => ({
    ArrowBack: () => <span data-testid="icon-back" />,
    BugReport: () => <span data-testid="icon-bug" />,
    Shield: () => <span data-testid="icon-shield" />,
    Code: () => <span data-testid="icon-code" />,
    Lightbulb: () => <span data-testid="icon-lightbulb" />,
}))

function renderModulePage(moduleId, modules = ALL_MODULES) {
    routeState.moduleId = moduleId
    mockUseVulnerabilities.mockReturnValue({
        modules,
        toggleModule: mockToggleModule,
    })

    return render(<ModulePage />)
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('ModulePage', () => {
    it('renders every known module route', () => {
        for (const mod of ALL_MODULES) {
            const { unmount } = renderModulePage(mod.id)
            expect(screen.getByText(mod.name)).toBeInTheDocument()
            expect(screen.queryByText(/module not found/i)).not.toBeInTheDocument()
            unmount()
        }
    })

    it('renders core education sections for SQL Injection', () => {
        renderModulePage('sql_injection')

        expect(screen.getByText('SQL Injection')).toBeInTheDocument()
        expect(screen.getByText(/A03:2025/)).toBeInTheDocument()
        expect(screen.getByText(/What is this vulnerability/i)).toBeInTheDocument()
        expect(screen.getByText(/How it works in this app/i)).toBeInTheDocument()
        expect(screen.getByText(/Example payload/i)).toBeInTheDocument()
        expect(screen.getByText(/Exploitation hints/i)).toBeInTheDocument()
        expect(screen.getByText(/Mitigation hints/i)).toBeInTheDocument()
    })

    it('reflects enabled state and toggles the current module', async () => {
        const user = userEvent.setup()
        renderModulePage('sql_injection')

        expect(screen.getByRole('switch')).toBeChecked()
        expect(screen.getByText(/^vulnerable$/i)).toBeInTheDocument()

        await user.click(screen.getByRole('switch'))

        expect(mockToggleModule).toHaveBeenCalledWith('sql_injection')
    })

    it('reflects disabled state', () => {
        const disabledModules = ALL_MODULES.map((mod) =>
            mod.id === 'sql_injection' ? { ...mod, enabled: false } : mod
        )

        renderModulePage('sql_injection', disabledModules)

        expect(screen.getByRole('switch')).not.toBeChecked()
        expect(screen.getByText(/^hardened$/i)).toBeInTheDocument()
    })

    it('handles unknown module IDs', () => {
        renderModulePage('not_real')

        expect(screen.getByText(/module not found/i)).toBeInTheDocument()
        expect(screen.getByText('No module with ID "not_real" exists.')).toBeInTheDocument()
    })
})
