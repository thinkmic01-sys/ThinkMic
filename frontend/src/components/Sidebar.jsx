import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MANAGEMENT_PAGES } from '../config/managementAccess';
import ConfigureMicModal from './ConfigureMicModal';

const NavLink = ({ to, icon, label }) => {
    const location = useLocation();
    // Create Seminar's route is still under /app/projects/* for now, but it belongs to
    // the Seminars section (reached from the Seminar Library), not Projects
    const isCreateSeminar = location.pathname.startsWith('/app/projects/create-seminar');

    // Determine active state
    let isActive = location.pathname === to || location.pathname.startsWith(to + '/');

    // Projects/Research are now two distinct sidebar entries (Project Hub used to be reached
    // only via a tab inside the Research page's top nav) - keep their active states disjoint.
    if (to === '/app/research') {
        isActive = location.pathname.startsWith('/app/research');
    }
    // Session History now has its own sidebar entry (used to only be reachable, if at all,
    // by manually navigating) - keep it from also lighting up the "Project Hub" entry.
    if (to === '/app/projects') {
        isActive = location.pathname.startsWith('/app/projects') && !isCreateSeminar && !location.pathname.startsWith('/app/projects/history');
    }
    // My Learning List now has its own sidebar entry (used to only be reachable via a button
    // on the Seminar Library page) - keep it from also lighting up the "Seminars" entry.
    if (to === '/app/courses') {
        isActive = (location.pathname.startsWith('/app/courses') && !location.pathname.startsWith('/app/courses/my-learning')) || isCreateSeminar;
    }

    return (
        <Link
            to={to}
            className={`w-full flex items-center gap-4 px-6 py-3.5 text-left transition-all duration-200
                ${isActive
                ? 'bg-[#097969] border-l-[4px] border-[#6bf6ff] text-[#6bf6ff] shadow-sm'
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
    const permissions = useSelector((state) => state.auth?.user?.permissions) || [];
    const managementPages = MANAGEMENT_PAGES.filter((page) => page.permissions.some((perm) => permissions.includes(perm)));
    // True admin/manager-style roles (holding at least one of the actual Management-page
    // permissions) get the reduced Management-only sidebar. A role that only carries
    // schemas.manage_own (e.g. Lecturer) is NOT one of these - they still do product work
    // as a regular user, just with an extra Schemas link (added below).
    const isAdmin = managementPages.length > 0;
    const canManageOwnSchemas = !isAdmin && permissions.includes('schemas.manage_own');
    const [isMicModalOpen, setIsMicModalOpen] = useState(false);

    return (
        <aside className={`w-[280px] h-screen bg-[#075e51] flex flex-col fixed left-0 top-0 text-white z-50 border-r border-[#181c22]/20 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>

            {/* Brand Area */}
            <div className="h-[88px] flex items-center justify-between px-6 mb-2 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#6bf6ff] rounded-full flex items-center justify-center text-[#075e51] font-bold shadow-[0_0_15px_rgba(107,246,255,0.3)]">
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
                {isAdmin ? (
                    // Admins manage the platform rather than use the product features
                    // themselves (per-user activity is already visible via Users > View Full
                    // Profile), so the sidebar lists every Management page directly instead of
                    // Projects/Reports/Seminars/etc.
                    managementPages.map((page) => (
                        <NavLink key={page.to} to={page.to} icon={page.icon} label={page.label} />
                    ))
                ) : (
                    <>
                        <NavLink to="/app/research" icon="workspaces" label="Projects" />
                        <NavLink to="/app/projects" icon="folder_open" label="Project Hub" />
                        <NavLink to="/app/projects/history" icon="history" label="History" />
                        <NavLink to="/app/reports" icon="summarize" label="Reports" />
                        <NavLink to="/app/courses" icon="school" label="Seminars" />
                        <NavLink to="/app/courses/my-learning" icon="bookmark" label="My Learning List" />
                        <NavLink to="/app/forms" icon="groups" label="Collaboration" />
                        <NavLink to="/app/achievements" icon="military_tech" label="Achievements" />
                        {canManageOwnSchemas && (
                            <NavLink to="/app/admin/schemas" icon="dynamic_form" label="Schemas" />
                        )}
                    </>
                )}
            </nav>

            {/* Footer Area (Configure Mic + Settings/Support) */}
            <div className="mt-auto flex flex-col pb-4 pt-4 shrink-0">
                <div className="px-6 mb-4">
                    <button
                        onClick={() => setIsMicModalOpen(true)}
                        className="w-full bg-[#6bf6ff] text-[#002022] font-bold text-[14px] py-3 rounded-md hover:bg-[#61f4fd] transition-colors shadow-sm"
                    >
                        Configure Mic
                    </button>
                </div>

                <nav className="flex flex-col gap-1">
                    <NavLink to="/app/settings" icon="settings" label="Settings" />
                    {permissions.includes('support.manage_all') ? (
                        <NavLink to="/app/admin/support" icon="support_agent" label="Support Inbox" />
                    ) : (
                        <NavLink to="/app/support" icon="help_outline" label="Support" />
                    )}
                </nav>
            </div>

            {isMicModalOpen && <ConfigureMicModal onClose={() => setIsMicModalOpen(false)} />}

        </aside>
    );
}