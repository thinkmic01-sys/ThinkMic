import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';

export default function Settings() {
    const { user } = useSelector((state) => state.auth);

    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);

    // We added 'avatar' to this state object so we can update it locally
    const [profileData, setProfileData] = useState({
        fullName: user?.name || 'Dr. Aria Thorne',
        title: user?.role || 'Lead AI Researcher',
        email: 'aria.thorne@thinkmic.edu',
        language: 'English (US)',
        avatar: user?.avatar || "https://i.pravatar.cc/150?u=aria"
    });

    // Reference to our hidden file input element
    const fileInputRef = useRef(null);

    const [apiKeys, setApiKeys] = useState([
        { id: 1, service: 'Data Ingestion API', key: 'tm_live_****************8f9a' },
        { id: 2, service: 'Analytics Export', key: 'tm_export_****************2b4c' },
    ]);

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
        }
    };

    // Handle Form Submission
    const handleSaveProfile = () => {
        setIsSaving(true);

        // Simulating a backend API call (e.g., uploading the image and saving data)
        setTimeout(() => {
            setIsSaving(false);
            alert(`Profile successfully updated for: ${profileData.fullName}`);
        }, 1000);
    };

    const handleRotateKey = (service) => {
        alert(`Requesting key rotation for: ${service}`);
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 font-sans">

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Settings Sub-Navigation */}
            <aside className="w-full md:w-56 lg:w-64 flex-shrink-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 md:mb-6">Settings</h1>

                {/* Horizontal scroll on mobile, Vertical stack on md+ */}
                <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    {['Profile', 'Security', 'API Keys', 'Notifications', 'Branding'].map((tab) => {
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
                </nav>
            </aside>

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
                                            type="email" name="email" value={profileData.email} onChange={handleProfileChange}
                                            className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2.5 px-3 text-[14px] outline-none transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Preferred Language</label>
                                        <div className="relative">
                                            <select
                                                name="language" value={profileData.language} onChange={handleProfileChange}
                                                className="w-full appearance-none bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-[#222777] focus:ring-1 focus:ring-[#222777] text-gray-900 py-2.5 px-3 pr-8 text-[14px] outline-none transition-shadow cursor-pointer"
                                            >
                                                <option>English (US)</option>
                                                <option>Spanish (ES)</option>
                                                <option>French (FR)</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-[#777682] pointer-events-none">expand_more</span>
                                        </div>
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

                {/* API Keys */}
                {(activeTab === 'api-keys' || activeTab === 'profile') && (
                    <section className={`bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-gray-100 p-5 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300 ${activeTab === 'profile' ? 'delay-75' : ''}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 sm:mb-6 gap-3 sm:gap-4">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">API Keys</h3>
                                <p className="font-mono text-[11px] sm:text-xs text-gray-500 mt-1">Manage credentials for external integrations.</p>
                            </div>
                            <button className="w-full sm:w-auto border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-[13px] sm:text-sm font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                <span className="material-symbols-outlined text-[18px]">add</span> New Key
                            </button>
                        </div>

                        <div className="overflow-x-auto border border-gray-200 rounded-lg w-full">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                                <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Service</th>
                                    <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Key</th>
                                    <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-[13px] sm:text-sm">
                                {apiKeys.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">{item.service}</td>
                                        <td className="py-3 px-4 font-mono text-gray-500">{item.key}</td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => handleRotateKey(item.service)}
                                                className="text-[#00c2cb] hover:text-[#006e73] font-semibold flex items-center justify-end gap-1 ml-auto transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">autorenew</span> Rotate
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Placeholders for other tabs */}
                {['security', 'notifications', 'branding'].includes(activeTab) && (
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-gray-100 h-48 sm:h-64 flex items-center justify-center animate-in fade-in zoom-in-95 duration-200 p-6 text-center">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-400 capitalize">{activeTab} settings coming soon</h2>
                    </div>
                )}

            </div>
        </div>
    );
}