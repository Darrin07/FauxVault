import { Outlet } from 'react-router-dom'
import NavBar from '../components/common/NavBar'
import './AppLayout.css';

export default function AppLayout() {
    return (
        <div className="app-layout">
            <NavBar />
            <main className="main-content">
                <Outlet />
            </main>
           {/* Add sidebar page */}        
           </div>
    )
}