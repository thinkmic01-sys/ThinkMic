import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const NavLink = ({ to, icon, label, isManagement }) => {
    const location = useLocation();
    // Create Seminar's route is still under /app/projects/* for now, but it belongs to
    // the Seminars section (reached from the Seminar Library), not Projects
    const isCreateSeminar = location.pathname.startsWith('/app/projects/create-seminar');

    // Determine active state
    let isActive = location.pathname === to || location.pathname.startsWith(to + '/');

    // Projects/Research active state grouping
    if (to === '/app/research') {
        isActive = (location.pathname.startsWith('/app/projects') || location.pathname.startsWith('/app/research')) && !isCreateSeminar;
    }
    if (to === '/app/courses' && isCreateSeminar) {
        isActive = true;
    }
    // Management active state grouping
    if (isManagement) {
        isActive = location.pathname.startsWith('/app/admin') && 
                   !location.pathname.startsWith('/app/admin/analytics') && 
                   !location.pathname.startsWith('/app/admin/support');
    }

    return (
        <Link
            to={to}
            className={`w-full flex items-center gap-4 px-6 py-3.5 text-left transition-all duration-200
                ${isActive
                ? 'bg-[#3a3f8f] border-l-[4px] border-[#6bf6ff] text-[#6bf6ff] shadow-sm'
                : 'text-[#c7c5d3] border-l-[4px] border-transparent hover:bg-white/5 hover:text-white'
            }`}
        >
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {icon}
            </span>
            <span className={`text-[15px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
        </Link>
    );
};

export default function Sidebar({ isOpen, setIsOpen }) {
    const role = useSelector((state) => state.auth?.user?.role);

    return (
        <aside className={`w-[280px] h-screen bg-[#222777] flex flex-col fixed left-0 top-0 text-white z-50 border-r border-[#181c22]/20 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>

            {/* Brand Area */}
            <div className="h-[88px] flex items-center justify-between px-6 mb-2 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#6bf6ff] rounded-full flex items-center justify-center text-[#222777] font-bold shadow-[0_0_15px_rgba(107,246,255,0.3)]">
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-[22px] leading-none tracking-tight text-white">ThinkMic</h1>
                        <p className="text-[11px] text-[#6bf6ff] opacity-90 uppercase tracking-widest font-mono mt-1">AI Research Hub</p>
                    </div>
                </div>
                <button className="lg:hidden text-[#c7c5d3] hover:text-white transition-colors" onClick={() => setIsOpen(false)}>
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Main Nav Links */}
            <nav className="flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                <NavLink to="/app/dashboard" icon="dashboard" label="Dashboard" />
                <NavLink to="/app/research" icon="workspaces" label="Projects" />
                <NavLink to="/app/reports" icon="summarize" label="Reports" />
                <NavLink to="/app/courses" icon="school" label="Seminars" />
                <NavLink to="/app/forms" icon="groups" label="Collaboration" />
                {role === 'admin' && (
                    <NavLink to="/app/admin/users" icon="admin_panel_settings" label="Management" isManagement />
                )}
                <NavLink to="/app/achievements" icon="military_tech" label="Achievements" />
            </nav>

            {/* Footer Area (Configure Mic + Settings/Support) */}
            <div className="mt-auto flex flex-col pb-4 pt-4 shrink-0">
                <div className="px-6 mb-4">
                    <button className="w-full bg-[#6bf6ff] text-[#002022] font-bold text-[14px] py-3 rounded-md hover:bg-[#61f4fd] transition-colors shadow-sm">
                        Configure Mic
                    </button>
                </div>

                <nav className="flex flex-col gap-1">
                    <NavLink to="/app/settings" icon="settings" label="Settings" />
                    {role === 'admin' || role === 'manager' ? (
                        <NavLink to="/app/admin/support" icon="support_agent" label="Support Inbox" />
                    ) : (
                        <NavLink to="/app/support" icon="help_outline" label="Support" />
                    )}
                </nav>
            </div>

        </aside>
    );
}