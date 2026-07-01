// frontend/src/components/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// A reusable mini-component for the main navigation links
const NavLink = ({ to, icon, label }) => {
    const location = useLocation();
    const isActive = location.pathname.startsWith(to);

    return (
        <Link
            to={to}
            className={`w-full flex items-center gap-4 px-6 py-3.5 text-left transition-all duration-200
        ${isActive
                ? 'bg-white/10 border-l-[3px] border-cyan text-white shadow-sm'
                : 'text-sidebar-text border-l-[3px] border-transparent hover:bg-white/5 hover:text-white'
            }`}
        >
      <span
          className="material-symbols-outlined text-[22px]"
          style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
            <span className={`text-[15px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
        {label}
      </span>
        </Link>
    );
};

// A reusable mini-component for the footer links (Settings & Support)
const FooterLink = ({ to, icon, label }) => {
    const location = useLocation();
    const isActive = location.pathname.startsWith(to);

    return (
        <Link
            to={to}
            className={`flex items-center gap-3 px-4 py-2.5 transition-all duration-200
        ${isActive
                ? 'bg-white/10 border-l-[3px] border-cyan text-cyan shadow-sm'
                : 'text-sidebar-text border-l-[3px] border-transparent hover:bg-white/5 hover:text-white'
            }`}
        >
      <span
          className="material-symbols-outlined text-[20px]"
          style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
            <span className={`text-sm ${isActive ? 'font-bold tracking-wide' : 'font-medium'}`}>{label}</span>
        </Link>
    );
};

export default function Sidebar({ isOpen, setIsOpen }) {
    return (
        <aside className={`w-[280px] h-screen bg-gradient-to-b from-primary to-sidebar flex flex-col fixed left-0 top-0 text-white z-50 border-r border-[#2A2E6B] transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>

            {/* Brand Logo Area */}
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

                {/* Close button for mobile */}
                <button className="lg:hidden text-white/70 hover:text-white transition-colors" onClick={() => setIsOpen(false)}>
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Main Navigation Links */}
            <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
                <NavLink to="/app/dashboard" icon="dashboard" label="Dashboard" />
                <NavLink to="/app/research" icon="account_tree" label="Projects" />
                <NavLink to="/app/reports" icon="description" label="Reports" />
                <NavLink to="/app/courses" icon="school" label="Courses" />
                <NavLink to="/app/forms" icon="group" label="Collaboration" />
                <NavLink to="/app/admin/users" icon="admin_panel_settings" label="Management" />
                <NavLink to="/app/achievements" icon="military_tech" label="Achievements" />
            </nav>

            {/* Bottom Configure Button */}
            <div className="px-6 py-4 shrink-0">
                <button className="w-full py-2.5 bg-cyan text-[#1E2255] rounded-md text-sm font-bold flex items-center justify-center gap-2 hover:bg-cyan/90 transition shadow-[0_4px_14px_rgba(0,194,203,0.25)]">
                    Configure Mic
                </button>
            </div>

            {/* Footer Links Area */}
            {/* Note: Removed px-6 from the wrapper so the background blocks stretch nicely inside the margins! */}
            <div className="pb-8 pt-4 flex flex-col gap-1 border-t border-[#2A2E6B]/50 mx-4 shrink-0">
                <FooterLink to="/app/settings" icon="settings" label="Settings" />
                <FooterLink to="/app/support" icon="help" label="Support" />
            </div>
        </aside>
    );
}