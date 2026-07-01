// frontend/src/components/Navbar.jsx
import React from 'react';
import { useSelector } from 'react-redux';

export default function Navbar({ onMenuClick }) {
    // Reach into Redux and grab the user data we set up earlier!
    const { user, isAuthenticated } = useSelector((state) => state.auth);

    const handleNotificationClick = () => {
        alert("Notifications panel would open here!");
    };

    const handleSettingsClick = () => {
        alert("Settings panel would open here!");
    };

    return (
        <header className="h-16 bg-surface border-b border-surface-border flex items-center justify-between px-8 sticky top-0 z-40">

            {/* Left side: Hamburger Menu & Breadcrumbs (Only ONE copy!) */}
            <div className="flex items-center gap-4 text-sm">
                {/* Hamburger Icon for Mobile/Tablet */}
                <button
                    onClick={onMenuClick}
                    className="lg:hidden text-gray-500 hover:text-primary transition-colors flex items-center"
                >
                    <span className="material-symbols-outlined text-[24px]">menu</span>
                </button>

                <span className="text-gray-500 font-medium hidden sm:inline">ThinkMic</span>
                <span className="text-gray-400 hidden sm:inline">/</span>
                <span className="text-primary font-semibold border-b-2 border-primary pb-1">Workspace</span>
            </div>

            {/* Right side: Dynamic Redux Data */}
            <div className="flex items-center gap-6">

                {/* Coin Chip (Now reads dynamically from Redux!) */}
                {isAuthenticated && user && (
                    <div className="flex items-center gap-2 bg-cyan-soft px-3 py-1.5 rounded-full border border-cyan/20 cursor-default">
                        <span className="text-cyan font-bold">Ⓢ</span>
                        <span className="text-cyan font-mono text-sm font-bold">+{user.coins.toLocaleString()}</span>
                    </div>
                )}

                {/* Action Icons */}
                <button
                    onClick={handleNotificationClick}
                    className="text-gray-500 hover:text-primary transition relative"
                >
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface"></span>
                </button>

                <button
                    onClick={handleSettingsClick}
                    className="text-gray-500 hover:text-primary transition"
                >
                    <span className="material-symbols-outlined">settings</span>
                </button>

                {/* User Profile */}
                {isAuthenticated && user ? (
                    <div className="flex items-center gap-3 border-l border-surface-border pl-6 cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-gray-900 leading-none">{user.name}</span>
                            <span className="text-xs text-gray-500">{user.role}</span>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gray-300 overflow-hidden ring-2 ring-cyan ring-offset-2">
                            <img src={user.avatar} alt="User profile" className="w-full h-full object-cover" />
                        </div>
                    </div>
                ) : (
                    <button className="bg-primary text-white px-4 py-2 rounded-md text-sm font-semibold">
                        Log In
                    </button>
                )}
            </div>
        </header>
    );
}