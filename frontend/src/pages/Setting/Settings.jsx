import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { logout, updateUser, normalizeUser } from '../../store/slices/authSlice';
import api from '../../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Duplicated from CreateSeminar.jsx's LocationMapPicker rather than extracted into a shared
// component, per project convention of not refactoring working code beyond what a feature needs.
const customMarkerIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
        <div class="flex flex-col items-center" style="transform: translate(-50%, -100%); margin-top: 8px;">
            <div class="w-5 h-5 bg-[#00c2cb] rounded-full border-2 border-white shadow-md flex items-center justify-center relative">
                <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute inset-0 rounded-full border-2 border-[#00c2cb] animate-ping opacity-50"></div>
            </div>
            <div class="w-1 h-3 bg-gradient-to-b from-[#00c2cb] to-transparent mt-0.5"></div>
        </div>
    `,
    iconSize: [0, 0]
});

function LocationMapPicker({ locationString, setLocationString }) {
    // Default to Boston center
    const [position, setPosition] = useState([42.3601, -71.0589]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const mapRef = useRef(null);

    const MapEvents = () => {
        useMapEvents({
            click(e) {
                setPosition([e.latlng.lat, e.latlng.lng]);
                setLocationString(`${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
            },
        });
        return null;
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                setPosition([lat, lon]);
                setLocationString(data[0].display_name);
                if (mapRef.current) {
                    mapRef.current.flyTo([lat, lon], 14);
                }
            } else {
                alert("Location not found.");
            }
        } catch (err) {
            console.error("Geocoding error", err);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle Leaflet resize when expanding or initially loading
    useEffect(() => {
        if (mapRef.current) {
            setTimeout(() => {
                mapRef.current.invalidateSize();
            }, 100);
            setTimeout(() => {
                mapRef.current.invalidateSize();
            }, 400); // Wait for CSS transition
        }
    }, [isExpanded]);

    return (
        <div className={`w-full rounded-xl border border-[#c7c5d3] overflow-hidden mt-3 relative z-0 transition-all duration-300 ease-in-out bg-[#e0e2eb] ${isExpanded ? 'h-[65vh] shadow-[0_8px_30px_rgba(34,39,119,0.15)] ring-2 ring-[#00c2cb]/50' : 'h-64 hover:shadow-md'}`}>

            {/* Top Toolbar overlay */}
            <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2 sm:gap-3 items-center pointer-events-none">
                <form onSubmit={handleSearch} className="flex-1 flex shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-lg overflow-hidden bg-white/95 backdrop-blur pointer-events-auto border border-[#c7c5d3]/50 transition-all focus-within:ring-2 focus-within:ring-[#00c2cb]/50">
                    <span className="material-symbols-outlined text-[#777682] text-[18px] pl-3 py-2">search</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for a city, landmark, or address..."
                        className="flex-1 px-2 py-2 text-[13px] outline-none bg-transparent font-medium text-[#181c22] placeholder:text-[#777682]"
                    />
                    <button type="submit" disabled={isSearching} className="bg-transparent px-3 text-[#222777] border-l border-[#e0e2eb]/50 hover:bg-[#f1f3fc] transition-colors flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">{isSearching ? 'hourglass_empty' : 'arrow_forward'}</span>
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="bg-white/95 backdrop-blur shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-lg w-9 h-9 sm:w-10 sm:h-10 text-[#222777] border border-[#c7c5d3]/50 hover:bg-[#f1f3fc] transition-colors flex items-center justify-center pointer-events-auto shrink-0"
                    title={isExpanded ? "Collapse Map" : "Expand Map"}
                >
                    <span className="material-symbols-outlined text-[20px]">{isExpanded ? 'fullscreen_exit' : 'fullscreen'}</span>
                </button>
            </div>

            <MapContainer
                center={position}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                attributionControl={false}
                zoomControl={false}
                ref={mapRef}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <ZoomControl position="bottomright" />
                <Marker position={position} icon={customMarkerIcon} />
                <MapEvents />
            </MapContainer>
        </div>
    );
}

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
    form_published: { icon: 'assignment', color: 'text-[#222777] bg-[#eef0f9]', title: 'New Form' },
    keyword_seminar_match: { icon: 'bookmark', color: 'text-[#00c2cb] bg-[#e6fbfc]', title: 'Followed Topic' },
    project_unlocked: { icon: 'toll', color: 'text-[#006e73] bg-[#e6fbfc]', title: 'Project Unlocked' }
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

    // Identity & KYC tab state
    const [identityData, setIdentityData] = useState({
        workPhone: '', personalPhone: '', address: '',
        kycIdType: '', kycIdNumber: '', idDocumentUrl: ''
    });
    const [certifications, setCertifications] = useState([]);
    const [isSavingIdentity, setIsSavingIdentity] = useState(false);
    const [isUploadingIdDoc, setIsUploadingIdDoc] = useState(false);
    const [uploadingCertIndex, setUploadingCertIndex] = useState(null);
    // Only sent to the backend when a fresh document was actually uploaded this session -
    // GET /users/me never echoes back the raw R2 key (only a presigned idDocumentUrl), so
    // leaving this null and skipping the field on save avoids blanking an already-saved key.
    const pendingIdDocumentKeyRef = useRef(null);
    const idDocInputRef = useRef(null);

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

            setIdentityData({
                workPhone: u.workPhone || '',
                personalPhone: u.personalPhone || '',
                address: u.address || '',
                kycIdType: u.kyc?.idType || '',
                kycIdNumber: u.kyc?.idNumber || '',
                idDocumentUrl: u.kyc?.idDocumentUrl || ''
            });
            setCertifications(u.certifications || []);
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

    const handleIdentityFieldChange = (e) => {
        const { name, value } = e.target;
        setIdentityData(prev => ({ ...prev, [name]: value }));
    };

    // Direct browser -> R2 PUT using a presigned URL, same pattern as SpeechWorkspace's audio
    // upload - a bare axios call so no auth header/credentials leak to the R2 endpoint.
    const uploadProfileDocument = async (file, purpose) => {
        const mimeType = file.type;
        const { data: presign } = await api.get('/users/me/documents/upload-url', { params: { mimeType, purpose } });
        await axios.put(presign.uploadUrl, file, { headers: { 'Content-Type': mimeType } });
        return presign.key;
    };

    const handleIdDocumentClick = () => idDocInputRef.current.click();

    const handleIdDocumentChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingIdDoc(true);
        try {
            const key = await uploadProfileDocument(file, 'kyc');
            pendingIdDocumentKeyRef.current = key;
            setIdentityData(prev => ({ ...prev, idDocumentUrl: URL.createObjectURL(file) }));
            showToast('Document uploaded - click Save to attach it to your profile.', 'success');
        } catch (error) {
            console.error('Failed to upload ID document', error);
            showToast(error.response?.data?.message || 'Failed to upload document.', 'error');
        } finally {
            setIsUploadingIdDoc(false);
            e.target.value = '';
        }
    };

    const handleAddCertification = () => {
        setCertifications(prev => [...prev, { title: '', issuer: '', issueDate: '', certificateKey: '', certificateUrl: '', description: '' }]);
    };

    const handleCertificationChange = (index, field, value) => {
        setCertifications(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
    };

    const handleRemoveCertification = (index) => {
        setCertifications(prev => prev.filter((_, i) => i !== index));
    };

    const handleCertificationFileChange = async (index, e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingCertIndex(index);
        try {
            const key = await uploadProfileDocument(file, 'certification');
            setCertifications(prev => prev.map((c, i) => i === index ? { ...c, certificateKey: key, certificateUrl: URL.createObjectURL(file) } : c));
        } catch (error) {
            console.error('Failed to upload certificate', error);
            showToast(error.response?.data?.message || 'Failed to upload certificate.', 'error');
        } finally {
            setUploadingCertIndex(null);
            e.target.value = '';
        }
    };

    const handleSaveIdentity = async () => {
        setIsSavingIdentity(true);
        try {
            const res = await api.patch('/users/me', {
                workPhone: identityData.workPhone,
                personalPhone: identityData.personalPhone,
                address: identityData.address,
                kycIdType: identityData.kycIdType || undefined,
                kycIdNumber: identityData.kycIdNumber,
                ...(pendingIdDocumentKeyRef.current ? { kycIdDocumentKey: pendingIdDocumentKeyRef.current } : {}),
                // Drop empty rows and the display-only certificateUrl before sending
                certifications: certifications
                    .filter(c => c.title && c.title.trim())
                    .map(c => ({ title: c.title, issuer: c.issuer, issueDate: c.issueDate, certificateKey: c.certificateKey, description: c.description }))
            });

            const u = res.data.user;
            setIdentityData({
                workPhone: u.workPhone || '',
                personalPhone: u.personalPhone || '',
                address: u.address || '',
                kycIdType: u.kyc?.idType || '',
                kycIdNumber: u.kyc?.idNumber || '',
                idDocumentUrl: u.kyc?.idDocumentUrl || ''
            });
            setCertifications(u.certifications || []);
            pendingIdDocumentKeyRef.current = null;
            showToast('Identity & contact details saved!', 'success');
        } catch (error) {
            console.error('Failed to save identity details', error);
            showToast(error.response?.data?.message || 'Failed to update. Please try again.', 'error');
        } finally {
            setIsSavingIdentity(false);
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
                    {['Profile', 'Identity', 'Security', 'Notifications'].map((tab) => {
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

                {/* Render Identity & KYC Tab Content */}
                {activeTab === 'identity' && (
                    <div className="space-y-6 sm:space-y-8">
                        <section className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-gray-100 p-5 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Contact Details</h3>
                            <p className="font-mono text-[11px] sm:text-xs text-gray-500 mb-5 sm:mb-6">Work and personal phone numbers, plus your postal address.</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div>
                                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Work Phone</label>
                                    <input
                                        type="tel" name="workPhone" value={identityData.workPhone} onChange={handleIdentityFieldChange}
                                        placeholder="+1 555 000 0000"
                                        className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2.5 px-3 text-[14px] outline-none transition-shadow"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Personal Phone</label>
                                    <input
                                        type="tel" name="personalPhone" value={identityData.personalPhone} onChange={handleIdentityFieldChange}
                                        placeholder="+1 555 000 0000"
                                        className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2.5 px-3 text-[14px] outline-none transition-shadow"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Postal Address</label>
                                    <input
                                        type="text" name="address" value={identityData.address} onChange={handleIdentityFieldChange}
                                        placeholder="Click map to drop pin or type address"
                                        className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2.5 px-3 text-[14px] outline-none transition-shadow"
                                    />
                                    <LocationMapPicker
                                        locationString={identityData.address}
                                        setLocationString={(val) => setIdentityData(prev => ({ ...prev, address: val }))}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-gray-100 p-5 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">KYC / Identity Verification</h3>
                            <p className="font-mono text-[11px] sm:text-xs text-gray-500 mb-5 sm:mb-6">Your ID number is encrypted at rest. Only visible to you and admins.</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div>
                                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">ID Type</label>
                                    <select
                                        name="kycIdType" value={identityData.kycIdType} onChange={handleIdentityFieldChange}
                                        className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2.5 px-3 text-[14px] outline-none transition-shadow"
                                    >
                                        <option value="">Select type...</option>
                                        <option value="id_card">National ID Card</option>
                                        <option value="passport">Passport</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">ID / Passport Number</label>
                                    <input
                                        type="text" name="kycIdNumber" value={identityData.kycIdNumber} onChange={handleIdentityFieldChange}
                                        placeholder="Enter ID or passport number"
                                        className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2.5 px-3 text-[14px] outline-none transition-shadow"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">ID Document / Passport Scan</label>
                                    <input type="file" ref={idDocInputRef} onChange={handleIdDocumentChange} className="hidden" accept="image/png,image/jpeg,image/webp,application/pdf" />
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <button
                                            type="button" onClick={handleIdDocumentClick} disabled={isUploadingIdDoc}
                                            className="bg-[#f1f3fc] text-[#222777] border border-[#c7c5d3] px-4 py-2.5 rounded-md font-bold text-[13px] hover:bg-[#e0e2eb] transition-colors flex items-center gap-2 shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">{isUploadingIdDoc ? 'hourglass_empty' : 'upload_file'}</span>
                                            {isUploadingIdDoc ? 'Uploading...' : 'Upload Scan'}
                                        </button>
                                        {identityData.idDocumentUrl && (
                                            <a href={identityData.idDocumentUrl} target="_blank" rel="noreferrer" className="text-[#00c2cb] hover:text-[#006e73] font-semibold text-[13px] flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                View current document
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-5 sm:pt-6">
                                <button
                                    onClick={handleSaveIdentity}
                                    disabled={isSavingIdentity}
                                    className={`w-full sm:w-auto bg-[#222777] text-white px-6 py-2.5 rounded-lg text-[13px] sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2
                                        ${isSavingIdentity ? 'opacity-80 cursor-not-allowed' : 'hover:bg-[#3a3f8f]'}`}
                                >
                                    {isSavingIdentity ? (
                                        <>
                                            <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </section>

                        <section className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-gray-100 p-5 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
                            <div className="flex justify-between items-center mb-1 gap-3">
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Certifications</h3>
                                <button
                                    type="button" onClick={handleAddCertification}
                                    className="text-[#00c2cb] hover:text-[#006e73] font-semibold text-[13px] transition-colors flex items-center gap-1 whitespace-nowrap"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                    Add Certification
                                </button>
                            </div>
                            <p className="font-mono text-[11px] sm:text-xs text-gray-500 mb-5 sm:mb-6">Any professional certifications you hold - we may use these in the future.</p>

                            {certifications.length === 0 ? (
                                <p className="text-center text-[13px] text-gray-500 py-6">No certifications added yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {certifications.map((cert, index) => (
                                        <div key={cert._id || index} className="p-4 rounded-lg border border-gray-100 bg-[#f9f9ff] relative">
                                            <button
                                                type="button" onClick={() => handleRemoveCertification(index)}
                                                className="absolute top-3 right-3 text-[#777682] hover:text-[#ba1a1a] transition-colors"
                                                title="Remove certification"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pr-8">
                                                <div>
                                                    <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">Title</label>
                                                    <input
                                                        type="text" value={cert.title} onChange={(e) => handleCertificationChange(index, 'title', e.target.value)}
                                                        placeholder="e.g. PMP Certification"
                                                        className="w-full bg-white rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2 px-3 text-[13px] outline-none transition-shadow"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">Issuer</label>
                                                    <input
                                                        type="text" value={cert.issuer || ''} onChange={(e) => handleCertificationChange(index, 'issuer', e.target.value)}
                                                        placeholder="e.g. PMI"
                                                        className="w-full bg-white rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2 px-3 text-[13px] outline-none transition-shadow"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">Issue Date</label>
                                                    <input
                                                        type="date" value={cert.issueDate ? String(cert.issueDate).slice(0, 10) : ''} onChange={(e) => handleCertificationChange(index, 'issueDate', e.target.value)}
                                                        className="w-full bg-white rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2 px-3 text-[13px] outline-none transition-shadow"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">Certificate File</label>
                                                    <input
                                                        type="file" id={`cert-file-${index}`} onChange={(e) => handleCertificationFileChange(index, e)}
                                                        className="hidden" accept="image/png,image/jpeg,image/webp,application/pdf"
                                                    />
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <button
                                                            type="button" onClick={() => document.getElementById(`cert-file-${index}`).click()}
                                                            disabled={uploadingCertIndex === index}
                                                            className="bg-white text-[#222777] border border-[#c7c5d3] px-3 py-2 rounded-md font-bold text-[12px] hover:bg-[#eef0f9] transition-colors flex items-center gap-1.5 shrink-0"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">{uploadingCertIndex === index ? 'hourglass_empty' : 'upload_file'}</span>
                                                            {uploadingCertIndex === index ? 'Uploading...' : 'Upload'}
                                                        </button>
                                                        {cert.certificateUrl && (
                                                            <a href={cert.certificateUrl} target="_blank" rel="noreferrer" className="text-[#00c2cb] hover:text-[#006e73] font-semibold text-[12px]">
                                                                View file
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">Description</label>
                                                    <input
                                                        type="text" value={cert.description || ''} onChange={(e) => handleCertificationChange(index, 'description', e.target.value)}
                                                        placeholder="Optional notes"
                                                        className="w-full bg-white rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2 px-3 text-[13px] outline-none transition-shadow"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-end pt-5 sm:pt-6">
                                <button
                                    onClick={handleSaveIdentity}
                                    disabled={isSavingIdentity}
                                    className={`w-full sm:w-auto bg-[#222777] text-white px-6 py-2.5 rounded-lg text-[13px] sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2
                                        ${isSavingIdentity ? 'opacity-80 cursor-not-allowed' : 'hover:bg-[#3a3f8f]'}`}
                                >
                                    {isSavingIdentity ? (
                                        <>
                                            <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </section>
                    </div>
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