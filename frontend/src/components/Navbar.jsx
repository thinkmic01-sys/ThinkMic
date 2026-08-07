import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import api from '../services/api';
import { API_BASE_URL } from '../config';

// Icon/color per notification type; the display title is translated via
// navbar.notificationTypes.<type> (falls back to navbar.notificationTypes.default)
const NOTIFICATION_META = {
    reminder: { icon: 'schedule', color: 'text-[#222777] bg-[#eef0f9]' },
    system: { icon: 'info', color: 'text-[#464651] bg-[#f1f3fc]' },
    update: { icon: 'auto_awesome', color: 'text-[#00c2cb] bg-[#e6fbfc]' },
    referral_pending: { icon: 'hourglass_empty', color: 'text-[#b45309] bg-[#fff8e1]' },
    referral_approved: { icon: 'check_circle', color: 'text-[#006e73] bg-[#e6fbfc]' },
    referral_rejected: { icon: 'cancel', color: 'text-[#ba1a1a] bg-[#ffdad6]' },
    seminar_reward_received: { icon: 'redeem', color: 'text-[#006e73] bg-[#e6fbfc]' },
    seminar_coins_reserved: { icon: 'lock_clock', color: 'text-[#222777] bg-[#eef0f9]' },
    seminar_coins_refunded: { icon: 'replay', color: 'text-[#006e73] bg-[#e6fbfc]' }
};
const DEFAULT_NOTIFICATION_META = { icon: 'notifications', color: 'text-[#777682] bg-[#f1f3fc]' };

export default function Navbar({ onMenuClick }) {
    const { t } = useTranslation();
    const { user, isAuthenticated, accessToken } = useSelector((state) => state.auth);
    const location = useLocation();
    const navigate = useNavigate();
    
    const [notifications, setNotifications] = useState([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !accessToken) return;
        const fetchNotifs = async () => {
            try {
                const res = await api.get('/notifications');
                setNotifications(res.data);
            } catch (err) {}
        };
        fetchNotifs();
    }, [isAuthenticated, accessToken]);

    // Settings page's "Mark all as read" fires this so the bell's unread dot clears immediately
    useEffect(() => {
        const handleExternalRead = () => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        window.addEventListener('thinkmic:notifications-read', handleExternalRead);
        return () => window.removeEventListener('thinkmic:notifications-read', handleExternalRead);
    }, []);

    // Real-time: background jobs (e.g. summarization) create a Notification and push it here
    // immediately, so the bell lights up even if the user never refreshes the page
    useEffect(() => {
        if (!isAuthenticated || !user?.id) return;

        const socket = io(API_BASE_URL, { withCredentials: true });

        socket.on('connect', () => socket.emit('join', user.id));

        socket.on('new_notification', (data) => {
            const incoming = data?.notification;
            if (!incoming) return;
            setNotifications(prev => {
                if (prev.some(n => n._id === incoming._id)) return prev;
                return [incoming, ...prev];
            });
        });

        return () => socket.disconnect();
    }, [isAuthenticated, user?.id]);

    const handleNotificationClick = async () => {
        setIsNotifOpen(!isNotifOpen);
        const hasUnread = notifications.some(n => !n.isRead);
        if (!isNotifOpen && hasUnread && accessToken) {
            try {
                await api.put('/notifications/read');
                setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            } catch (err) {}
        }
    };

    const handleNotificationItemClick = (notification) => {
        setIsNotifOpen(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const handleSettingsClick = () => navigate('/app/settings');
    const isSettingsActive = location.pathname.startsWith('/app/settings');

    // Helper to determine active Topbar link
    const isTopActive = (path) => location.pathname.includes(path);

    // Dynamic Top Navigation Logic based on System Design
    const renderTopNav = () => {
        // Create Seminar's route is still under /app/projects/* for now, but it's reached
        // from and belongs to the Seminars section, not Projects Hub
        if (location.pathname.startsWith('/app/projects/create-seminar')) {
            return (
                <div className="flex items-center gap-2 sm:gap-4 text-[13px] sm:text-sm whitespace-nowrap">
                    <span className="text-gray-500 font-medium hidden sm:inline">{t('common.brand')}</span>
                    <span className="text-gray-400 hidden sm:inline">/</span>
                    <span className="text-[#222777] font-bold">{t('sidebar.seminars')}</span>
                </div>
            );
        }

        // If inside the Projects/Research workflow
        if (location.pathname.includes('/app/projects') || location.pathname.includes('/app/research')) {
            return (
                <div className="flex space-x-4 sm:space-x-6 h-full items-center overflow-x-auto hide-scrollbar">
                    <Link to="/app/research" className={`h-full flex items-center border-b-[3px] px-1 text-[13px] sm:text-[14px] font-bold transition-colors whitespace-nowrap ${isTopActive('/app/research') ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        {t('navbar.aiResearchWizard')}
                    </Link>
                    <Link to="/app/projects" className={`h-full flex items-center border-b-[3px] px-1 text-[13px] sm:text-[14px] font-bold transition-colors whitespace-nowrap ${isTopActive('/app/projects') ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        {t('navbar.projectsHub')}
                    </Link>
                </div>
            );
        }

        // If inside Achievements workflow
        if (location.pathname.includes('/app/achievements')) {
            return (
                <div className="flex space-x-4 sm:space-x-6 h-full items-center overflow-x-auto hide-scrollbar">
                    <Link to="/app/achievements" className={`h-full flex items-center border-b-[3px] px-1 text-[13px] sm:text-[14px] font-bold transition-colors whitespace-nowrap ${location.pathname === '/app/achievements' ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        {t('navbar.rewards')}
                    </Link>
                    <Link to="/app/achievements/timeline" className={`h-full flex items-center border-b-[3px] px-1 text-[13px] sm:text-[14px] font-bold transition-colors whitespace-nowrap ${location.pathname.includes('timeline') ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        {t('navbar.myTimeline')}
                    </Link>
                </div>
            );
        }

        // If inside Management workflow
        if (location.pathname.startsWith('/app/admin/users') || location.pathname.startsWith('/app/admin/schemas') || location.pathname.startsWith('/app/admin/rewards')) {
            return (
                <div className="flex space-x-4 sm:space-x-6 h-full items-center overflow-x-auto hide-scrollbar">
                    <Link to="/app/admin/users" className={`h-full flex items-center border-b-[3px] px-1 text-[13px] sm:text-[14px] font-bold transition-colors whitespace-nowrap ${isTopActive('/app/admin/users') ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        {t('navbar.users')}
                    </Link>
                    <Link to="/app/admin/schemas" className={`h-full flex items-center border-b-[3px] px-1 text-[13px] sm:text-[14px] font-bold transition-colors whitespace-nowrap ${isTopActive('/app/admin/schemas') ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        {t('navbar.schemas')}
                    </Link>
                    <Link to="/app/admin/rewards" className={`h-full flex items-center border-b-[3px] px-1 text-[13px] sm:text-[14px] font-bold transition-colors whitespace-nowrap ${isTopActive('/app/admin/rewards') ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}>
                        {t('navbar.rewards')}
                    </Link>
                </div>
            );
        }

        // If inside the Seminars (Course Library) section - route is still /app/courses/*,
        // but the section is branded "Seminars" so the breadcrumb shouldn't read "Courses"
        if (location.pathname.includes('/app/courses')) {
            return (
                <div className="flex items-center gap-2 sm:gap-4 text-[13px] sm:text-sm whitespace-nowrap">
                    <span className="text-gray-500 font-medium hidden sm:inline">{t('common.brand')}</span>
                    <span className="text-gray-400 hidden sm:inline">/</span>
                    <span className="text-[#222777] font-bold">{t('sidebar.seminars')}</span>
                </div>
            );
        }

        // Default Breadcrumbs for other pages - the page name itself is derived from the
        // URL segment, so it isn't translated in this pass (see plan: only chrome + Dashboard)
        const pageName = location.pathname.split('/').pop().charAt(0).toUpperCase() + location.pathname.split('/').pop().slice(1);
        return (
            <div className="flex items-center gap-2 sm:gap-4 text-[13px] sm:text-sm whitespace-nowrap">
                <span className="text-gray-500 font-medium hidden sm:inline">{t('common.brand')}</span>
                <span className="text-gray-400 hidden sm:inline">/</span>
                <span className="text-[#222777] font-bold">{pageName}</span>
            </div>
        );
    };

    return (
        <>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <header className="h-[64px] bg-white border-b border-[#e0e2eb] flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 w-full">

                {/* Left side: Hamburger Menu & Dynamic Top Navigation */}
                <div className="flex items-center gap-2 sm:gap-4 h-full overflow-hidden flex-1">
                    <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-[#222777] transition-colors flex items-center shrink-0">
                        <span className="material-symbols-outlined text-[24px]">menu</span>
                    </button>
                    {renderTopNav()}
                </div>

                {/* Right side: Utilities & User Data */}
                <div className="flex items-center gap-3 sm:gap-4 md:gap-6 shrink-0 pl-2">

                    {isAuthenticated && user && (
                        <div className="hidden md:flex items-center gap-2 bg-[#e6fbfc] px-3 py-1.5 rounded-full border border-[#6bf6ff]/50 cursor-default shrink-0">
                            <span className="material-symbols-outlined text-[#006e73] text-[16px]">toll</span>
                            <span className="text-[#006e73] font-mono text-[13px] font-bold">+{user.coins.toLocaleString()}</span>
                        </div>
                    )}

                    <div className="flex gap-1 sm:gap-2 shrink-0">
                        <div className="relative">
                            <button onClick={handleNotificationClick} className="text-[#777682] hover:text-[#222777] transition relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-[#f1f3fc]">
                                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">notifications</span>
                                {notifications.some(n => !n.isRead) && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#ba1a1a] rounded-full border-2 border-white"></span>
                                )}
                            </button>
                            
                            {isNotifOpen && (
                                <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-white border border-[#e0e2eb] rounded-xl shadow-lg z-50 overflow-hidden flex flex-col max-h-96">
                                    <div className="p-3 border-b border-[#e0e2eb] bg-[#f9f9ff]">
                                        <h3 className="font-bold text-[#181c22] text-[14px]">{t('navbar.notificationsPanelTitle')}</h3>
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        {notifications.length === 0 ? (
                                            <p className="p-4 text-center text-[13px] text-[#777682]">{t('navbar.noNotifications')}</p>
                                        ) : (
                                            notifications.map(n => {
                                                const meta = NOTIFICATION_META[n.type] || DEFAULT_NOTIFICATION_META;
                                                const title = t(`navbar.notificationTypes.${n.type}`, { defaultValue: t('navbar.notificationTypes.default') });
                                                return (
                                                    <div key={n._id} onClick={() => handleNotificationItemClick(n)} className={`p-3 border-b border-[#e0e2eb] last:border-b-0 hover:bg-[#f1f3fc] transition-colors cursor-pointer flex gap-2.5 ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                                                            <span className="material-symbols-outlined text-[15px]">{meta.icon}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[12px] font-bold text-[#181c22] leading-tight mb-0.5">{title}</p>
                                                            <p className="text-[13px] text-[#464651] leading-tight mb-1">{n.message}</p>
                                                            <span className="text-[10px] text-[#777682] font-mono">{new Date(n.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={handleSettingsClick} className={`transition w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full ${isSettingsActive ? 'text-[#222777] bg-[#f1f3fc]' : 'text-[#777682] hover:text-[#222777] hover:bg-[#f1f3fc]'}`}>
                            <span className="material-symbols-outlined text-[20px] sm:text-[24px]">settings</span>
                        </button>
                    </div>

                    {isAuthenticated && user ? (
                        <div className="flex items-center gap-2 sm:gap-3 border-l border-[#e0e2eb] pl-3 sm:pl-6 cursor-pointer hover:opacity-80 transition-opacity shrink-0">
                            <div className="hidden lg:flex flex-col items-end">
                                <span className="text-[14px] font-bold text-[#181c22] leading-none">{user.name}</span>
                                <span className="text-[12px] text-[#777682] font-semibold">{user.role}</span>
                            </div>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#f1f3fc] overflow-hidden ring-2 ring-[#6bf6ff] ring-offset-1 sm:ring-offset-2 shrink-0">
                                <img src={user.avatar} alt={t('navbar.userProfileAlt')} className="w-full h-full object-cover" />
                            </div>
                        </div>
                    ) : (
                        <button className="bg-[#222777] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-[12px] sm:text-[13px] font-bold shadow-sm shrink-0">
                            {t('navbar.logIn')}
                        </button>
                    )}
                </div>
            </header>
        </>
    );
}