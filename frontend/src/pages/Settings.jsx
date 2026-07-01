// frontend/src/pages/Settings.jsx
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
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-7xl mx-auto p-4 md:p-8">

            {/* Settings Sub-Navigation */}
            <aside className="w-full md:w-64 flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
                <nav className="flex flex-col gap-2">
                    {['Profile', 'Security', 'API Keys', 'Notifications', 'Branding'].map((tab) => {
                        const tabId = tab.toLowerCase().replace(' ', '-');
                        const isActive = activeTab === tabId;
                        return (
                            <button
                                key={tabId}
                                onClick={() => setActiveTab(tabId)}
                                className={`text-left px-4 py-2.5 rounded-md text-sm font-semibold transition-colors flex items-center justify-between group
                  ${isActive
                                    ? 'bg-cyan-soft/30 text-primary border border-cyan/20 shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                {tab}
                                <span className={`material-symbols-outlined text-[18px] transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                  chevron_right
                </span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 space-y-8">

                {/* Render Profile Tab Content */}
                {activeTab === 'profile' && (
                    <section className="bg-white rounded-xl shadow-card border border-gray-100 p-8 animate-fade-in-up">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h3>

                        <div className="flex flex-col xl:flex-row gap-8 items-start">

                            {/* Avatar Upload UI */}
                            <div className="flex flex-col items-center gap-3">
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
                                    className="w-24 h-24 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 relative group cursor-pointer shadow-sm"
                                >
                                    <img src={profileData.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-primary/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                        <span className="material-symbols-outlined text-white">upload</span>
                                    </div>
                                </div>
                                <span className="font-mono text-xs text-gray-500 font-semibold uppercase tracking-wider">Update Avatar</span>
                            </div>

                            {/* Profile Form */}
                            <div className="flex-1 w-full space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
                                        <input
                                            type="text" name="fullName" value={profileData.fullName} onChange={handleProfileChange}
                                            className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary text-gray-900 py-2 px-3 text-sm outline-none transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Professional Title</label>
                                        <input
                                            type="text" name="title" value={profileData.title} onChange={handleProfileChange}
                                            className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary text-gray-900 py-2 px-3 text-sm outline-none transition-shadow"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
                                        <input
                                            type="email" name="email" value={profileData.email} onChange={handleProfileChange}
                                            className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary text-gray-900 py-2 px-3 text-sm outline-none transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Preferred Language</label>
                                        <select
                                            name="language" value={profileData.language} onChange={handleProfileChange}
                                            className="w-full bg-[#f9f9ff] rounded-md border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary text-gray-900 py-2 px-3 text-sm outline-none transition-shadow"
                                        >
                                            <option>English (US)</option>
                                            <option>Spanish (ES)</option>
                                            <option>French (FR)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={isSaving}
                                        className={`bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2
                      ${isSaving ? 'opacity-80 cursor-not-allowed' : 'hover:bg-opacity-90'}`}
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
                    <section className="bg-white rounded-xl shadow-card border border-gray-100 p-8 animate-fade-in-up delay-75">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">API Keys</h3>
                                <p className="font-mono text-xs text-gray-500 mt-1">Manage credentials for external integrations.</p>
                            </div>
                            <button className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                                <span className="material-symbols-outlined text-[18px]">add</span> New Key
                            </button>
                        </div>

                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                                <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Service</th>
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Key</th>
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-sm">
                                {apiKeys.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4 font-semibold text-gray-900">{item.service}</td>
                                        <td className="py-3 px-4 font-mono text-gray-500">{item.key}</td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => handleRotateKey(item.service)}
                                                className="text-primary hover:text-cyan font-semibold flex items-center justify-end gap-1 ml-auto transition-colors"
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
                    <div className="bg-white rounded-xl shadow-card border border-gray-100 h-64 flex items-center justify-center animate-fade-in-up">
                        <h2 className="text-xl font-bold text-gray-400 capitalize">{activeTab} settings coming soon</h2>
                    </div>
                )}

            </div>
        </div>
    );
}