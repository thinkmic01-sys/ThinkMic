
// frontend/src/components/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NavLink = ({ to, icon, label, isManagement }) => {
    const location = useLocation();

    // Determine active state
    let isActive = location.pathname.startsWith(to);

    // Projects/Research active state grouping
    if (to === '/app/projects') {
        isActive = location.pathname.startsWith('/app/projects') || location.pathname.startsWith('/app/research');
    }
    // Management active state grouping
    if (isManagement) {
        isActive = location.pathname.startsWith('/app/admin');
    }

    return (
        <Link
            to={to}
            className={`w-full flex items-center gap-4 px-6 py-3.5 text-left transition-all duration-200
                ${isActive
                ? 'bg-white/10 border-l-[3px] border-cyan text-white shadow-sm'
                : 'text-sidebar-text border-l-[3px] border-transparent hover:bg-white/5 hover:text-white'
            }`}
        >
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {icon}
            </span>
            <span className={`text-[15px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
        </Link>
    );
};

const FooterLink = ({ to, icon, label }) => {
    const location = useLocation();
    const isActive = location.pathname.startsWith(to);

    return (
        <Link to={to} className={`flex items-center gap-3 px-4 py-2.5 transition-all duration-200 ${isActive ? 'bg-white/10 border-l-[3px] border-cyan text-cyan shadow-sm' : 'text-sidebar-text border-l-[3px] border-transparent hover:bg-white/5 hover:text-white'}`}>
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
            <span className={`text-sm ${isActive ? 'font-bold tracking-wide' : 'font-medium'}`}>{label}</span>
        </Link>
    );
};

export default function Sidebar({ isOpen, setIsOpen }) {
    return (
        <aside className={`w-[280px] h-screen bg-gradient-to-b from-primary to-sidebar flex flex-col fixed left-0 top-0 text-white z-50 border-r border-[#2A2E6B] transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
            {/* Brand Area */}
            <div className="h-[88px] flex items-center justify-between px-6 mb-4 mt-2 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan rounded-full flex items-center justify-center text-sidebar font-bold shadow-[0_0_15px_rgba(0,194,203,0.3)]">
                        <span className="material-symbols-outlined text-[#1E2255] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-[22px] leading-none tracking-tight">ThinkMic</h1>
                        <p className="text-[11px] text-cyan-soft opacity-80 uppercase tracking-widest font-mono mt-1">AI Research Hub</p>
                    </div>
                </div>
                <button className="lg:hidden text-white/70 hover:text-white transition-colors" onClick={() => setIsOpen(false)}>
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
                <NavLink to="/app/dashboard" icon="dashboard" label="Dashboard" />
                <NavLink to="/app/projects" icon="account_tree" label="Projects" />
                <NavLink to="/app/reports" icon="description" label="Reports" />
                <NavLink to="/app/courses" icon="school" label="Courses" />
                <NavLink to="/app/forms" icon="group" label="Collaboration" />
                <NavLink to="/app/admin/users" icon="admin_panel_settings" label="Management" isManagement />
                <NavLink to="/app/achievements" icon="military_tech" label="Achievements" />
            </nav>
            {/* ... Rest of footer ... */}
        </aside>
    );
}