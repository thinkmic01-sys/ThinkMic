// frontend/src/components/Navbar.jsx
import React from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ onMenuClick }) {
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const location = useLocation();

    const handleNotificationClick = () => alert("Notifications panel would open here!");
    const handleSettingsClick = () => alert("Settings panel would open here!");

    // Helper to determine active Topbar link
    const isTopActive = (path) => location.pathname.includes(path);

    // Dynamic Top Navigation Logic based on System Design
    const renderTopNav = () => {
        // If inside the Projects/Research workflow
        if (location.pathname.includes('/app/projects') || location.pathname.includes('/app/research')) {
            return (
                <div className="flex space-x-6 h-full items-center">
                    <Link to="/app/projects" className={`h-full flex items-center border-b-[3px] text-[14px] font-bold transition-colors ${isTopActive('/app/projects') ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        Projects Hub
                    </Link>
                    <Link to="/app/research" className={`h-full flex items-center border-b-[3px] text-[14px] font-bold transition-colors ${isTopActive('/app/research') ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        AI Research Wizard
                    </Link>
                </div>
            );
        }

        // If inside Achievements workflow
        if (location.pathname.includes('/app/achievements')) {
            return (
                <div className="flex space-x-6 h-full items-center">
                    <Link to="/app/achievements" className={`h-full flex items-center border-b-[3px] text-[14px] font-bold transition-colors ${location.pathname === '/app/achievements' ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        Rewards
                    </Link>
                    <Link to="/app/achievements/timeline" className={`h-full flex items-center border-b-[3px] text-[14px] font-bold transition-colors ${location.pathname.includes('timeline') ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        My Timeline
                    </Link>
                </div>
            );
        }

        // If inside Management workflow
        if (location.pathname.includes('/app/admin')) {
            return (
                <div className="flex space-x-6 h-full items-center">
                    <Link to="/app/admin/dashboard" className={`h-full flex items-center border-b-[3px] text-[14px] font-bold transition-colors ${isTopActive('/app/admin/dashboard') ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        Analytics
                    </Link>
                    <Link to="/app/admin/users" className={`h-full flex items-center border-b-[3px] text-[14px] font-bold transition-colors ${isTopActive('/app/admin/users') ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        Users
                    </Link>
                    <Link to="/app/admin/schemas" className={`h-full flex items-center border-b-[3px] text-[14px] font-bold transition-colors ${isTopActive('/app/admin/schemas') ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        Schemas
                    </Link>
                </div>
            );
        }

        // Default Breadcrumbs for other pages
        const pageName = location.pathname.split('/').pop().charAt(0).toUpperCase() + location.pathname.split('/').pop().slice(1);
        return (
            <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500 font-medium hidden sm:inline">ThinkMic</span>
                <span className="text-gray-400 hidden sm:inline">/</span>
                <span className="text-[#222777] font-bold">{pageName}</span>
            </div>
        );
    };

    return (
        <header className="h-[64px] bg-white border-b border-[#e0e2eb] flex items-center justify-between px-8 sticky top-0 z-40">

            {/* Left side: Hamburger Menu & Dynamic Top Navigation */}
            <div className="flex items-center gap-4 h-full">
                <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-[#222777] transition-colors flex items-center">
                    <span className="material-symbols-outlined text-[24px]">menu</span>
                </button>
                {renderTopNav()}
            </div>

            {/* Right side: Utilities & User Data */}
            <div className="flex items-center gap-6">

                {isAuthenticated && user && (
                    <div className="flex items-center gap-2 bg-[#e6fbfc] px-3 py-1.5 rounded-full border border-[#6bf6ff]/50 cursor-default">
                        <span className="material-symbols-outlined text-[#006e73] text-[16px]">toll</span>
                        <span className="text-[#006e73] font-mono text-[13px] font-bold">+{user.coins.toLocaleString()}</span>
                    </div>
                )}

                <div className="flex gap-2">
                    <button onClick={handleNotificationClick} className="text-[#777682] hover:text-[#222777] transition relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f1f3fc]">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full border-2 border-white"></span>
                    </button>

                    <button onClick={handleSettingsClick} className="text-[#777682] hover:text-[#222777] transition w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f1f3fc]">
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                </div>

                {isAuthenticated && user ? (
                    <div className="flex items-center gap-3 border-l border-[#e0e2eb] pl-6 cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="flex flex-col items-end">
                            <span className="text-[14px] font-bold text-[#181c22] leading-none">{user.name}</span>
                            <span className="text-[12px] text-[#777682] font-semibold">{user.role}</span>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-[#f1f3fc] overflow-hidden ring-2 ring-[#6bf6ff] ring-offset-2">
                            <img src={user.avatar} alt="User profile" className="w-full h-full object-cover" />
                        </div>
                    </div>
                ) : (
                    <button className="bg-[#222777] text-white px-4 py-2 rounded-md text-[13px] font-bold shadow-sm">
                        Log In
                    </button>
                )}
            </div>
        </header>
    );
}