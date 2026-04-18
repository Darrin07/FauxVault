import { Outlet } from 'react-router-dom'
import NavBar from '../components/common/NavBar'
import './AppLayout.css';

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
                <h3>Vulnerabilities</h3>
                {/* Add sidebar page */}
            </aside>
           </div>
    )
}