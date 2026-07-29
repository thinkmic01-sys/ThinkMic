// frontend/src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import SupportSidebar from './SupportSidebar';

export default function Layout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);

    useEffect(() => {
        const handleOpen = () => setIsSupportOpen(true);
        window.addEventListener('open-support', handleOpen);
        return () => window.removeEventListener('open-support', handleOpen);
    }, []);

    return (
        <div className="flex h-screen bg-[#f9f9ff] text-[#181c22] font-sans overflow-hidden">

            {/* Modular Sidebar Component */}
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-w-0 h-screen lg:ml-[280px]">

                {/* Modular Navbar Component */}
                <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

                <main className="flex-1 overflow-hidden relative">
                    {children}
                </main>
            </div>

            {/* Support Chat Sidebar */}
            <SupportSidebar isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
        </div>
    );
}