// frontend/src/components/Layout.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import SupportSidebar from './SupportSidebar';
import PackagesPromptModal from './PackagesPromptModal';

export default function Layout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [summaryToast, setSummaryToast] = useState(null);
    const dismissTimerRef = useRef(null);

    const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);
    const userId = useSelector((state) => state.auth?.user?.id);
    const navigate = useNavigate();

    useEffect(() => {
        const handleOpen = () => setIsSupportOpen(true);
        window.addEventListener('open-support', handleOpen);
        return () => window.removeEventListener('open-support', handleOpen);
    }, []);

    // Global background-job notice: shows anywhere in the app when a summary finishes
    // processing, so the user doesn't have to stay on the Speech Workspace to find out
    useEffect(() => {
        if (!isAuthenticated || !userId) return;

        const socket = io(API_BASE_URL, { withCredentials: true });
        socket.on('connect', () => socket.emit('join', userId));

        socket.on('summarization_complete', (data) => {
            const link = `/app/research?recordingId=${data.recordingId || ''}&transcriptId=${data.transcriptId || ''}`;
            clearTimeout(dismissTimerRef.current);
            setSummaryToast({ title: data.title || 'Your research audio', link });
            dismissTimerRef.current = setTimeout(() => setSummaryToast(null), 6000);
        });

        return () => {
            clearTimeout(dismissTimerRef.current);
            socket.disconnect();
        };
    }, [isAuthenticated, userId]);

    const handleOpenSession = () => {
        if (!summaryToast) return;
        navigate(summaryToast.link);
        setSummaryToast(null);
    };

    return (
        <div className="flex h-screen bg-[#F4F9F8] text-[#181c22] font-sans overflow-hidden">

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

            {/* Package purchase prompt - shown once per login to a user with no purchased package */}
            <PackagesPromptModal />

            {/* Global AI Summary Ready Toast */}
            {summaryToast && (
                <div className="fixed bottom-6 right-6 z-[100] w-[320px] bg-white border border-[#e0e2eb] rounded-xl shadow-lg p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-[#FEF9C3] text-[#EAB308] flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                            </span>
                            <p className="font-bold text-[#181c22] text-[14px]">AI Summary Ready</p>
                        </div>
                        <button onClick={() => setSummaryToast(null)} className="text-[#777682] hover:text-[#181c22] transition-colors">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                    <p className="text-[13px] text-[#464651] leading-snug">
                        Your research summary for "{summaryToast.title}" is ready to explore.
                    </p>
                    <button
                        onClick={handleOpenSession}
                        className="mt-1 self-start bg-[#075e51] text-white text-[12px] font-bold px-3 py-1.5 rounded-md hover:bg-[#097969] transition-colors flex items-center gap-1"
                    >
                        Open Session <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                </div>
            )}
        </div>
    );
}