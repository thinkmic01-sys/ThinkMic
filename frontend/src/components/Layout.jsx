// frontend/src/components/Layout.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import SupportSidebar from './SupportSidebar';

export default function Layout({ children }) {
    const { t, i18n } = useTranslation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [summaryToast, setSummaryToast] = useState(null);
    const dismissTimerRef = useRef(null);

    const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);
    const userId = useSelector((state) => state.auth?.user?.id);
    const userLanguage = useSelector((state) => state.auth?.user?.language) || 'en';
    const navigate = useNavigate();

    useEffect(() => {
        const handleOpen = () => setIsSupportOpen(true);
        window.addEventListener('open-support', handleOpen);
        return () => window.removeEventListener('open-support', handleOpen);
    }, []);

    // Global UI locale + RTL switch, driven by the logged-in user's saved preference
    // (kept in sync from Settings) - mirrors the dir/font-urdu pattern already used for
    // transcript display in SpeechWorkspace.jsx, just applied at the document level.
    useEffect(() => {
        i18n.changeLanguage(userLanguage);
        document.documentElement.lang = userLanguage;
        document.documentElement.dir = userLanguage === 'ur' ? 'rtl' : 'ltr';
    }, [userLanguage, i18n]);

    // Global background-job notice: shows anywhere in the app when a summary finishes
    // processing, so the user doesn't have to stay on the Speech Workspace to find out
    useEffect(() => {
        if (!isAuthenticated || !userId) return;

        const socket = io(API_BASE_URL, { withCredentials: true });
        socket.on('connect', () => socket.emit('join', userId));

        socket.on('summarization_complete', (data) => {
            const link = `/app/research?recordingId=${data.recordingId || ''}&transcriptId=${data.transcriptId || ''}`;
            clearTimeout(dismissTimerRef.current);
            setSummaryToast({ title: data.title || t('layout.defaultRecordingTitle'), link });
            dismissTimerRef.current = setTimeout(() => setSummaryToast(null), 6000);
        });

        return () => {
            clearTimeout(dismissTimerRef.current);
            socket.disconnect();
        };
    }, [isAuthenticated, userId, t]);

    const handleOpenSession = () => {
        if (!summaryToast) return;
        navigate(summaryToast.link);
        setSummaryToast(null);
    };

    return (
        <div className={`flex h-screen bg-[#f9f9ff] text-[#181c22] font-sans overflow-hidden ${userLanguage === 'ur' ? 'font-urdu' : ''}`}>

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

            {/* Global AI Summary Ready Toast */}
            {summaryToast && (
                <div className="fixed bottom-6 right-6 z-[100] w-[320px] bg-white border border-[#e0e2eb] rounded-xl shadow-lg p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-[#e6fbfc] text-[#00c2cb] flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                            </span>
                            <p className="font-bold text-[#181c22] text-[14px]">{t('layout.summaryReadyTitle')}</p>
                        </div>
                        <button onClick={() => setSummaryToast(null)} className="text-[#777682] hover:text-[#181c22] transition-colors">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                    <p className="text-[13px] text-[#464651] leading-snug">
                        {t('layout.summaryReadyBody', { title: summaryToast.title })}
                    </p>
                    <button
                        onClick={handleOpenSession}
                        className="mt-1 self-start bg-[#222777] text-white text-[12px] font-bold px-3 py-1.5 rounded-md hover:bg-[#3a3f8f] transition-colors flex items-center gap-1"
                    >
                        {t('layout.openSession')} <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                </div>
            )}
        </div>
    );
}