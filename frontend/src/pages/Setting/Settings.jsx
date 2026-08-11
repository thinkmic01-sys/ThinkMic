import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, updateUser, normalizeUser } from '../../store/slices/authSlice';
import api from '../../services/api';

// Mirrors NOTIFICATION_META in components/Navbar.jsx so notification cards look identical in both places
const NOTIFICATION_META = {
    reminder: { icon: 'schedule', color: 'text-[#222777] bg-[#eef0f9]', title: 'Reminder' },
    system: { icon: 'info', color: 'text-[#464651] bg-[#f1f3fc]', title: 'System' },
    update: { icon: 'campaign', color: 'text-[#222777] bg-[#eef0f9]', title: 'Update' },
    referral_pending: { icon: 'hourglass_empty', color: 'text-[#b45309] bg-[#fff8e1]', title: 'Referral Pending' },
    referral_approved: { icon: 'check_circle', color: 'text-[#006e73] bg-[#e6fbfc]', title: 'Referral Approved' },
    referral_rejected: { icon: 'cancel', color: 'text-[#ba1a1a] bg-[#ffdad6]', title: 'Referral Rejected' },
    seminar_reward_received: { icon: 'redeem', color: 'text-[#006e73] bg-[#e6fbfc]', title: 'Reward Received' },
    seminar_coins_reserved: { icon: 'lock_clock', color: 'text-[#222777] bg-[#eef0f9]', title: 'Coins Reserved' },
    seminar_coins_refunded: { icon: 'replay', color: 'text-[#006e73] bg-[#e6fbfc]', title: 'Coins Refunded' },
    form_published: { icon: 'assignment', color: 'text-[#222777] bg-[#eef0f9]', title: 'New Form' }
};
const DEFAULT_NOTIFICATION_META = { icon: 'notifications', color: 'text-[#777682] bg-[#f1f3fc]', title: 'Notification' };

export default function Settings() {
    const { user, accessToken } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // Security tab state
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState({ current: false, next: false, confirm: false });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Notifications tab state
    const [notificationPrefs, setNotificationPrefs] = useState({
        seminarReminders: true,
        researchReports: true,
        rewardAlerts: true,
        systemUpdates: true
    });
    const [isSavingPrefs, setIsSavingPrefs] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isMarkingRead, setIsMarkingRead] = useState(false);

    // We added 'avatar' to this state object so we can update it locally
    const [profileData, setProfileData] = useState({
        fullName: user?.name || '',
        title: '',
        email: user?.email || '',
        language: 'English (US)',
        avatar: user?.avatar || "https://i.pravatar.cc/150?u=aria"
    });
    const [avatarFile, setAvatarFile] = useState(null);

    // Custom Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    };

    // Load the real profile so Title/Language/Avatar/Notification Prefs reflect what's actually saved
    useEffect(() => {
        if (!accessToken) return;
        api.get('/users/me').then(res => {
            const u = res.data.user;
            setProfileData(prev => ({
                ...prev,
                fullName: u.fullName || prev.fullName,
                title: u.title || '',
                email: u.email || prev.email,
                language: u.preferredLanguage || 'English (US)',
                avatar: u.avatarUrl || prev.avatar
            }));
            // Undefined/missing prefs default to true; only an explicit false is honored
            const prefs = u.notificationPrefs || {};
            setNotificationPrefs({
                seminarReminders: prefs.seminarReminders !== false,
                researchReports: prefs.researchReports !== false,
                rewardAlerts: prefs.rewardAlerts !== false,
                systemUpdates: prefs.systemUpdates !== false
            });
        }).catch(err => console.error('Failed to load profile', err));
    }, [accessToken]);

    // Load the notification feed for the Notifications tab
    useEffect(() => {
        if (!accessToken) return;
        api.get('/notifications').then(res => {
            setNotifications(res.data);
        }).catch(err => console.error('Failed to load notifications', err));
    }, [accessToken]);

    // Reference to our hidden file input element
    const fileInputRef = useRef(null);

    // Handle Text Inputs
    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    // Handle Clicking the Avatar Box
    const handleAvatarClick = () => {
        fileInputRef.current.click(); // Triggers the hidden file input
    };

    // Handle Selecting a File
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Create a temporary local URL to instantly preview the selected image
            const imageUrl = URL.createObjectURL(file);
            setProfileData(prev => ({ ...prev, avatar: imageUrl }));
            setAvatarFile(file);
        }
    };

    // Handle Form Submission
    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            let avatarUrl;
            if (avatarFile) {
                const formData = new FormData();
                formData.append('image', avatarFile);
                const uploadRes = await api.post('/upload', formData);
                avatarUrl = uploadRes.data.url;
            }

            const res = await api.patch('/users/me', {
                fullName: profileData.fullName,
                title: profileData.title,
                language: profileData.language,
                ...(avatarUrl ? { avatarUrl } : {})
            });

            // Push the authoritative saved values into Redux so the Navbar (and anything else
            // reading state.auth.user) reflects them immediately - no refresh/re-login needed.
            // Routed through the same normalizeUser used by login/refresh so the auth state
            // shape can never drift between the two flows.
            const savedUser = res.data.user;
            dispatch(updateUser(normalizeUser(savedUser)));
            // Replace any transient local blob: preview URL with the real hosted one
            setProfileData(prev => ({ ...prev, avatar: savedUser.avatarUrl || prev.avatar }));

            setAvatarFile(null);
            showToast('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Failed to save profile', error);
            showToast('Failed to update profile. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordFieldChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({ ...prev, [name]: value }));
    };

    const handleChangePassword = async () => {
        const { currentPassword, newPassword, confirmPassword } = passwordForm;
        if (!currentPassword) {
            showToast('Please enter your current password.', 'error');
            return;
        }
        if (newPassword.length < 8) {
            showToast('New password must be at least 8 characters long.', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match.', 'error');
            return;
        }

        setIsChangingPassword(true);
        try {
            await api.patch('/auth/change-password', { currentPassword, newPassword });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showToast('Password updated successfully!', 'success');
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to update password. Please try again.';
            showToast(message, 'error');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleTogglePref = (key) => {
        setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSavePrefs = async () => {
        setIsSavingPrefs(true);
        try {
            await api.patch('/users/me', { notificationPrefs });
            showToast('Notification preferences saved!', 'success');
        } catch (error) {
            console.error('Failed to save notification preferences', error);
            showToast('Failed to save preferences. Please try again.', 'error');
        } finally {
            setIsSavingPrefs(false);
        }
    };

    const handleMarkAllRead = async () => {
        if (!notifications.some(n => !n.isRead)) return;
        setIsMarkingRead(true);
        try {
            await api.put('/notifications/read');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            // Navbar's notification bell keeps its own local copy - nudge it to clear the unread dot too
            window.dispatchEvent(new Event('thinkmic:notifications-read'));
        } catch (error) {
            console.error('Failed to mark notifications as read', error);
            showToast('Failed to mark notifications as read.', 'error');
        } finally {
            setIsMarkingRead(false);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Logout failed:", error);
        }
        dispatch(logout());
        navigate('/login');
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full p-4 sm:p-6 md:p-8 font-sans">

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Settings Sub-Navigation */}
            <aside className="w-full md:w-56 lg:w-64 flex-shrink-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 md:mb-6">Settings</h1>

                {/* Horizontal scroll on mobile, Vertical stack on md+ */}
                <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    {['Profile', 'Security', 'Notifications'].map((tab) => {
                        const tabId = tab.toLowerCase().replace(' ', '-');
                        const isActive = activeTab === tabId;
                        return (
                            <button
                                key={tabId}
                                onClick={() => setActiveTab(tabId)}
                                className={`text-left px-4 py-2 sm:py-2.5 rounded-md text-[13px] sm:text-sm font-semibold transition-colors flex items-center justify-between group whitespace-nowrap shrink-0 md:shrink
                                    ${isActive
                                    ? 'bg-[#e6fbfc] text-[#006e73] border border-[#00c2cb]/30 shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                }`}
                            >
                                {tab}
                                <span className={`hidden md:block material-symbols-outlined text-[18px] transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                                    chevron_right
                                </span>
                            </button>
                        );
                    })}
                    
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full flex items-center justify-between px-4 py-2.5 sm:py-3 mt-6 sm:mt-8 rounded-lg bg-[#ba1a1a]/5 hover:bg-[#ba1a1a]/10 text-[#ba1a1a] font-bold text-[13px] sm:text-sm transition-colors border border-[#ba1a1a]/20"
                    >
                        Log Out of System
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                    </button>
                </nav>
            </aside>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#002022]/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all border border-[#e0e2eb]">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#ba1a1a]/10 mb-4 mx-auto">
                            <span className="material-symbols-outlined text-[#ba1a1a] text-2xl">logout</span>
                        </div>
                        <h3 className="text-xl font-bold text-center text-[#181c22] mb-2">Ready to Leave?</h3>
                        <p className="text-sm text-center text-[#464651] mb-6">
                            Are you sure you want to log out of your workspace?
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1 px-4 py-2 bg-[#f1f3fc] text-[#464651] font-bold text-[13px] rounded-lg hover:bg-[#e0e2eb] transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleLogout}
                                className="flex-1 px-4 py-2 bg-[#ba1a1a] text-white font-bold text-[13px] rounded-lg shadow-sm hover:bg-[#93000a] transition-colors"
                            >
                                Yes, Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 space-y-6 sm:space-y-8 w-full min-w-0">

                {/* Render Profile Tab Content */}
                {activeTab === 'profile' && (
                    <section className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-gray-100 p-5 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5 sm:mb-6">My Profile</h3>

                        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-center lg:items-start">

                            {/* Avatar Upload UI */}
                            <div className="flex flex-col items-center gap-3 shrink-0">
                                {/* Hidden File Input */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/jpg"
                                />

                                {/* Clickable Avatar Canvas */}
                                <div
                                    onClick={handleAvatarClick}
                                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 relative group cursor-pointer shadow-sm"
                                >
                                    <img src={profileData.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-[#222777]/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                                        <span className="material-symbols-outlined text-white">upload</span>
                                    </div>
                                </div>
                                <span className="font-mono text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-wider">Update Avatar</span>
                            </div>

                            {/* Profile Form */}
                            <div className="flex-1 w-full space-y-5 sm:space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Full Name</label>
                                        <input
                                            type="text" name="fullName" value={profileData.fullName} onChange={handleProfileChange}
                                            className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2.5 px-3 text-[14px] outline-none transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Professional Title</label>
                                        <input
                                            type="text" name="title" value={profileData.title} onChange={handleProfileChange}
                                            className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2.5 px-3 text-[14px] outline-none transition-shadow"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Email Address</label>
                                        <input
                                            type="email" name="email" value={profileData.email} disabled title="Contact support to change your login email"
                                            className="w-full bg-gray-100 rounded-md border border-gray-200 text-gray-500 py-2.5 px-3 text-[14px] outline-none cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Preferred Language</label>
                                        <input
                                            type="text" value="English" disabled
                                            className="w-full bg-gray-100 rounded-md border border-gray-200 text-gray-500 py-2.5 px-3 text-[14px] outline-none cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2 sm:pt-4">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={isSaving}
                                        className={`w-full sm:w-auto bg-[#222777] text-white px-6 py-2.5 rounded-lg text-[13px] sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2
                                            ${isSaving ? 'opacity-80 cursor-not-allowed' : 'hover:bg-[#3a3f8f]'}`}
                                    >
                                        {isSaving ? (
                                            <>
                                                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Render Security Tab Content */}
                {activeTab === 'security' && (
                    <section className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-gray-100 p-5 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Change Password</h3>
                        <p className="font-mono text-[11px] sm:text-xs text-gray-500 mb-5 sm:mb-6">Use a strong password you don't use elsewhere.</p>

                        <div className="max-w-md space-y-4 sm:space-y-5">
                            {[
                                { key: 'current', field: 'currentPassword', label: 'Current Password' },
                                { key: 'next', field: 'newPassword', label: 'New Password' },
                                { key: 'confirm', field: 'confirmPassword', label: 'Confirm New Password' }
                            ].map(({ key, field, label }) => (
                                <div key={field}>
                                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">{label}</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword[key] ? 'text' : 'password'}
                                            name={field}
                                            value={passwordForm[field]}
                                            onChange={handlePasswordFieldChange}
                                            autoComplete="new-password"
                                            className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2.5 px-3 pr-10 text-[14px] outline-none transition-shadow"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(prev => ({ ...prev, [key]: !prev[key] }))}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777682] hover:text-[#222777] transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">{showPassword[key] ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className="flex justify-end pt-2 sm:pt-4">
                                <button
                                    onClick={handleChangePassword}
                                    disabled={isChangingPassword}
                                    className={`w-full sm:w-auto bg-[#222777] text-white px-6 py-2.5 rounded-lg text-[13px] sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2
                                        ${isChangingPassword ? 'opacity-80 cursor-not-allowed' : 'hover:bg-[#3a3f8f]'}`}
                                >
                                    {isChangingPassword ? (
                                        <>
                                            <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Password'
                                    )}
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* Render Notifications Tab Content */}
                {activeTab === 'notifications' && (
                    <>
                        <section className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-gray-100 p-5 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Notification Preferences</h3>
                            <p className="font-mono text-[11px] sm:text-xs text-gray-500 mb-5 sm:mb-6">Choose what you'd like to be notified about.</p>

                            <div className="space-y-3 sm:space-y-4">
                                {[
                                    { key: 'seminarReminders', icon: 'schedule', title: 'Seminar Reminders', desc: 'Receive alerts for upcoming registered seminars.' },
                                    { key: 'researchReports', icon: 'campaign', title: 'Research & Reports', desc: 'Notify when background AI report synthesis completes.' },
                                    { key: 'rewardAlerts', icon: 'toll', title: 'Reward & Referral Alerts', desc: 'Alert when coins or referral bonuses are credited.' },
                                    { key: 'systemUpdates', icon: 'notifications', title: 'System Updates', desc: 'Important system announcements and maintenance.' }
                                ].map(({ key, icon, title, desc }) => (
                                    <div key={key} className="flex items-center justify-between gap-4 p-3.5 sm:p-4 rounded-lg border border-gray-100 bg-[#f9f9ff]">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <span className="material-symbols-outlined text-[#222777] text-[20px] shrink-0 mt-0.5">{icon}</span>
                                            <div className="min-w-0">
                                                <p className="text-[13px] sm:text-sm font-bold text-gray-900">{title}</p>
                                                <p className="font-mono text-[11px] sm:text-xs text-gray-500 mt-0.5">{desc}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePref(key)}
                                            className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${notificationPrefs[key] ? 'bg-[#222777]' : 'bg-gray-300'}`}
                                        >
                                            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${notificationPrefs[key] ? 'left-[22px]' : 'left-0.5'}`}></span>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end pt-4 sm:pt-6">
                                <button
                                    onClick={handleSavePrefs}
                                    disabled={isSavingPrefs}
                                    className={`w-full sm:w-auto bg-[#222777] text-white px-6 py-2.5 rounded-lg text-[13px] sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2
                                        ${isSavingPrefs ? 'opacity-80 cursor-not-allowed' : 'hover:bg-[#3a3f8f]'}`}
                                >
                                    {isSavingPrefs ? (
                                        <>
                                            <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Preferences'
                                    )}
                                </button>
                            </div>
                        </section>

                        <section className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-gray-100 p-5 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
                            <div className="flex justify-between items-center mb-5 sm:mb-6 gap-3">
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Notifications</h3>
                                <button
                                    onClick={handleMarkAllRead}
                                    disabled={isMarkingRead || !notifications.some(n => !n.isRead)}
                                    className="text-[#00c2cb] hover:text-[#006e73] font-semibold text-[13px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    Mark all as read
                                </button>
                            </div>

                            {notifications.length === 0 ? (
                                <p className="text-center text-[13px] text-gray-500 py-8">You have no notifications.</p>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {notifications.map(n => {
                                        const meta = NOTIFICATION_META[n.type] || DEFAULT_NOTIFICATION_META;
                                        return (
                                            <div key={n._id} className={`flex gap-3 p-3 rounded-lg border border-gray-100 ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                                                    <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-bold text-gray-900 leading-tight mb-0.5">{meta.title}</p>
                                                    <p className="text-[13px] text-gray-600 leading-tight mb-1">{n.message}</p>
                                                    <span className="text-[10px] text-gray-400 font-mono">{new Date(n.createdAt).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                )}

            </div>

            {/* --- CUSTOM TOAST NOTIFICATION --- */}
            <div className={`fixed bottom-24 right-6 z-50 transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${toast.type === 'error' ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]' : 'bg-[#e6fbfc] border-[#00c2cb] text-[#006e73]'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <span className="text-[13px] sm:text-[14px] font-bold">{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 hover:opacity-70">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>
        </div>
    );
}