import { Outlet } from 'react-router-dom'
import NavBar from '../components/common/NavBar'
import './AppLayout.css';
import VulnerabilityPanel from '../components/common/VulnerabilityPanel';

export default function AppLayout() {
    return (
        <div className="app-layout">
            {/* Status Bar area */}
            <div className="status-bar-area">
                <div style={{ background: 'var(--color-vulnerable)', height: '100%', display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: '12px', fontWeight: 'bold'}}>
                    System Vulnerable
                </div>
            </div>
            <div className='navbar-area'>
            <NavBar />
            </div>
            <main className="main-content">
                <Outlet />
            </main>
            <aside className='sidebar-area'>
                <VulnerabilityPanel />
                {/* Add sidebar page */}
            </aside>
           </div>
    )
}