// frontend/src/components/Layout.jsx
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background flex font-sans text-gray-900 overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Removed overflow-y-auto from this wrapper so the Navbar stays fixed */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-[280px] h-screen transition-all duration-300">

                {/* Navbar is now strictly locked to the top, unaffected by scrollbars */}
                <div className="flex-none">
                    <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
                </div>

                {/* The scrolling behavior is now isolated ONLY to the page content below the Navbar */}
                <main className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden">
                    {children}
                </main>

            </div>

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-[#1E2255]/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
}