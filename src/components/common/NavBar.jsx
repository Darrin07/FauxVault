import { NavLink } from "react-router-dom";
import { LayoutDashboard, Send, History, User } from 'lucide-react';
import './NavBar.css';

const NAV_LINKS = [
    { to: '/dashboard', label: 'Dashboard'},
    { to: '/transfer', label: 'Transfer'},
    { to: '/history', label: 'History'},
    { to: '/admin', label: 'Admin'}
]

export default function NavBar() {
    return (
        <nav className="navbar">
            <div classname="navbar-logo">
            <span classname="logo-text">FAUXVAULT</span>
            </div>
            <ul className="navbar__links">
                {NAV_LINKS.map((link) => (
                    <li key={(link.to)}>
                        <NavLink to={link.to} className={({ isActive }) => 
                        `navbar__link ${isActive ? 'navbar__link--active' : ''}`
                     }
                     >
                        {link.label}
                     </NavLink>
                    </li>
                ))
                }
            </ul>
        </nav>
    )  
}