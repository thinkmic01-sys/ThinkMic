import React, { useState, useEffect } from 'react';

// --- MOCK DATA FOR REFERRALS ---
const referralStats = { total: 142, pending: 450, earned: 3200, conversion: 28.4 };
const recentReferrals = [
    { id: 1, initials: 'EL', name: 'Dr. Elena Rostova', date: 'Oct 24, 2026', status: 'Premium', rewards: '500 Coins' },
    { id: 2, initials: 'MS', name: 'Marcus Sterling', date: 'Oct 22, 2026', status: 'Active', rewards: '150 Coins' },
    { id: 3, initials: 'AJ', name: 'alex.j@university.edu', date: 'Oct 21, 2026', status: 'Invited', rewards: '-' },
];

export default function Collaboration() {
    // --- STATE: REFERRALS ---
    const [isCopied, setIsCopied] = useState(false);
    const referralLink = "https://thinkmic.com/join?ref=scholarly_mind";

    // --- STATE: FORM MODAL ---
    const [isFormOpen, setIsFormOpen] = useState(false);

    // --- STATE: FORM FIELDS ---
    const [researcherName, setResearcherName] = useState('Eleanor Shellstrop');
    const [projectCategory, setProjectCategory] = useState('AI Ethics');
    const [submissionId, setSubmissionId] = useState('');
    const [researchSummary, setResearchSummary] = useState('Our methodology focused on evaluating the ethical implications of large language models in educational settings, primarily...');
    const [dataSources, setDataSources] = useState({ generatedData: true, surveyResults: false });
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isRecording, setIsRecording] = useState(false);

    // --- PROGRESS TRACKING ENGINE ---
    const [completedFields, setCompletedFields] = useState(3);
    const totalFields = 8;

    useEffect(() => {
        let count = 0;
        if (researcherName.trim() !== '') count++;
        if (projectCategory !== '') count++;
        if (submissionId.trim() !== '') count++;
        if (researchSummary.trim() !== '') count++;
        if (Object.values(dataSources).some(val => val === true)) count++;
        if (uploadedFiles.length > 0) count++;
        if (count < 3) count = 3; // Base of 3 to match screenshot's initial state
        setCompletedFields(count);
    }, [researcherName, projectCategory, submissionId, researchSummary, dataSources, uploadedFiles]);

    // --- HANDLERS ---
    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || e.target.files || []);
        setUploadedFiles(prev => [...prev, ...files]);
    };

    const handleFormSubmit = () => {
        if (!submissionId) return alert("Please fill out the required Submission ID field.");
        alert("Form successfully locked and submitted for peer review queue.");
        setIsFormOpen(false);
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-y-auto relative font-sans custom-scrollbar">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="max-w-[1280px] mx-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6 pb-20 animate-in fade-in duration-300">

                {/* --- HERO BANNER (UPDATED WITH FORM BUTTON) --- */}
                <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                    <div className="w-full md:max-w-2xl text-center md:text-left">
                        <h2 className="text-[28px] sm:text-[32px] md:text-[40px] font-bold text-[#222777] mb-2 sm:mb-3 leading-tight tracking-tight">Grow the ThinkMic Community</h2>
                        <p className="text-[#464651] text-[14px] sm:text-[16px] leading-[1.7] sm:leading-[1.85] mb-5 sm:mb-6">
                            Invite researchers, scholars, and AI enthusiasts to ThinkMic. Earn platform coins for every active referral and unlock premium collaboration features.
                        </p>
                        <div className="flex justify-center md:justify-start gap-4 w-full">
                            <button
                                onClick={() => setIsFormOpen(true)}
                                className="w-full sm:w-auto justify-center bg-[#222777] text-white font-bold text-[13px] sm:text-[14px] px-6 py-3 rounded-lg hover:bg-[#3a3f8f] transition-colors shadow-sm flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">assignment</span>
                                Submit Research
                            </button>
                        </div>
                    </div>
                    <div className="shrink-0 text-[#6bf6ff] hidden md:block">
                        <span className="material-symbols-outlined text-[80px] lg:text-[100px]" style={{ fontVariationSettings: "'wght' 200" }}>pie_chart</span>
                    </div>
                </div>

                {/* --- REFERRALS DASHBOARD CONTENT --- */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-auto sm:h-[120px] gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[#777682] gap-1 sm:gap-0">
                            <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">Total Referrals</span>
                            <span className="material-symbols-outlined text-[16px] sm:text-[20px] hidden sm:block">person_add</span>
                        </div>
                        <span className="text-[28px] sm:text-[32px] font-bold text-[#222777] leading-none">{referralStats.total}</span>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-auto sm:h-[120px] gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[#777682] gap-1 sm:gap-0">
                            <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">Pending Coins</span>
                            <span className="material-symbols-outlined text-[16px] sm:text-[20px] hidden sm:block">hourglass_empty</span>
                        </div>
                        <span className="text-[28px] sm:text-[32px] font-bold text-[#00c2cb] leading-none">{referralStats.pending}</span>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-auto sm:h-[120px] gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[#777682] gap-1 sm:gap-0">
                            <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">Earned Coins</span>
                            <span className="material-symbols-outlined text-[16px] sm:text-[20px] hidden sm:block">toll</span>
                        </div>
                        <span className="text-[28px] sm:text-[32px] font-bold text-[#00c2cb] leading-none">{referralStats.earned.toLocaleString()}</span>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-auto sm:h-[120px] gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[#777682] gap-1 sm:gap-0">
                            <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">Conversion</span>
                            <span className="material-symbols-outlined text-[16px] sm:text-[20px] hidden sm:block">trending_up</span>
                        </div>
                        <span className="text-[28px] sm:text-[32px] font-bold text-[#222777] leading-none">{referralStats.conversion}%</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 lg:p-8 lg:col-span-2 flex flex-col justify-center">
                        <h3 className="text-[18px] sm:text-[20px] font-bold text-[#222777] mb-4">Your Unique Referral Link</h3>
                        <div className="flex flex-col sm:flex-row gap-3 mb-5 sm:mb-6">
                            <div className="flex-1 relative">
                                <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[#777682]">link</span>
                                <input type="text" readOnly value={referralLink} className="w-full bg-[#f1f3fc] border border-[#c7c5d3] rounded-lg py-3 pl-10 sm:pl-12 pr-4 text-[13px] sm:text-[14px] font-mono text-[#181c22] outline-none" />
                            </div>
                            <button onClick={handleCopyLink} className={`px-6 py-3 rounded-lg text-[13px] sm:text-[14px] font-bold transition-colors flex items-center justify-center min-w-[120px] shadow-sm ${isCopied ? 'bg-[#00c2cb] text-[#002022]' : 'bg-[#222777] text-white hover:bg-[#3a3f8f]'}`}>
                                {isCopied ? 'Copied!' : 'Copy Link'}
                            </button>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4">
                            <span className="text-[13px] sm:text-[14px] font-bold text-[#464651]">Share via:</span>
                            <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#f1f3fc] border border-[#c7c5d3] text-[#222777] hover:bg-[#e0e2eb] flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-[18px] sm:text-[20px]">mail</span></button>
                            <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#f1f3fc] border border-[#c7c5d3] text-[#222777] hover:bg-[#e0e2eb] flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-[18px] sm:text-[20px]">chat</span></button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center">
                        <h3 className="text-[18px] sm:text-[20px] font-bold text-[#222777] mb-4 sm:mb-6">Quick Scan</h3>
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#f1f3fc] border border-[#e0e2eb] rounded-lg mb-4 p-2 grid grid-cols-2 gap-2">
                            <div className="bg-[#222777]/80 rounded-sm"></div><div className="bg-[#222777]/80 rounded-sm"></div>
                            <div className="bg-[#222777]/80 rounded-sm"></div><div className="flex gap-1"><div className="w-1/2 bg-[#00c2cb] rounded-sm"></div><div className="w-1/2 bg-[#222777]/80 rounded-sm"></div></div>
                        </div>
                        <p className="text-[11px] sm:text-[12px] font-bold text-[#777682] mb-3 sm:mb-4">Let colleagues scan to join instantly.</p>
                        <button className="text-[#222777] text-[13px] sm:text-[14px] font-bold hover:text-[#00c2cb] transition-colors flex items-center justify-center w-full sm:w-auto gap-1">
                            <span className="material-symbols-outlined text-[18px]">download</span> Download PNG
                        </button>
                    </div>
                </div>

                {/* Referrals Table */}
                <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] overflow-hidden w-full flex flex-col">
                    <div className="flex justify-between items-center p-4 sm:p-6 border-b border-[#e0e2eb]">
                        <h3 className="text-[18px] sm:text-[20px] font-bold text-[#222777]">Recent Referrals</h3>
                        <button className="text-[13px] sm:text-[14px] font-bold text-[#222777] flex items-center gap-1 hover:text-[#00c2cb] transition-colors">
                            View All <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_forward</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto w-full custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                            <tr className="bg-[#f9f9ff] border-b border-[#e0e2eb] text-[11px] sm:text-[12px] font-bold text-[#777682] uppercase tracking-wider whitespace-nowrap">
                                <th className="py-3 px-4 sm:px-6">User</th>
                                <th className="py-3 px-4 sm:px-6">Date Invited</th>
                                <th className="py-3 px-4 sm:px-6">Status</th>
                                <th className="py-3 px-4 sm:px-6 text-right">Rewards Earned</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e0e2eb] text-[13px] sm:text-[14px]">
                            {recentReferrals.map((user) => (
                                <tr key={user.id} className="hover:bg-[#f9f9ff] transition-colors">
                                    <td className="py-3 sm:py-4 px-4 sm:px-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded flex items-center justify-center text-[11px] sm:text-[12px] font-bold shrink-0 ${user.status === 'Invited' ? 'bg-[#f1f3fc] border border-[#c7c5d3] text-[#777682] border-dashed' : 'bg-[#e0e0ff] text-[#222777]'}`}>{user.initials}</div>
                                            <span className="font-bold text-[#181c22] whitespace-nowrap">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 sm:py-4 px-4 sm:px-6 font-mono text-[11px] sm:text-[12px] text-[#464651] whitespace-nowrap">{user.date}</td>
                                    <td className="py-3 sm:py-4 px-4 sm:px-6 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2.5 py-1 rounded font-bold uppercase tracking-wider border border-transparent
                                                ${user.status === 'Premium' ? 'bg-[#e0e0ff] text-[#070963]' : ''}
                                                ${user.status === 'Active' ? 'bg-[#e6fbfc] text-[#006e73]' : ''}
                                                ${user.status === 'Invited' ? '!border-[#c7c5d3] text-[#777682] bg-white' : ''}`}
                                            >
                                                {user.status === 'Premium' && <span className="material-symbols-outlined text-[12px] sm:text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>}
                                                {user.status === 'Active' && <span className="material-symbols-outlined text-[12px] sm:text-[14px]">check_circle</span>}
                                                {user.status === 'Invited' && <span className="material-symbols-outlined text-[12px] sm:text-[14px]">mail</span>}
                                                {user.status}
                                            </span>
                                    </td>
                                    <td className={`py-3 sm:py-4 px-4 sm:px-6 text-right font-mono font-bold text-[13px] sm:text-[14px] whitespace-nowrap ${user.rewards === '-' ? 'text-[#777682]' : 'text-[#00c2cb]'}`}>{user.rewards}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* --- RESEARCH SUBMISSION FORM OVERLAY --- */}
            {/* ========================================================================= */}

            <div className={`fixed inset-0 bg-[#2d3037]/90 backdrop-blur-sm z-50 overflow-y-auto flex justify-center items-start transition-opacity duration-300 ${isFormOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} p-4`}>

                <div className={`relative w-full max-w-[760px] my-4 sm:my-8 transition-all duration-300 ${isFormOpen ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'}`}>

                    <div className="bg-[#f9f9ff] rounded-xl shadow-2xl flex flex-col p-4 sm:p-6">

                        {/* Close Button Inside Card */}
                        <div className="flex justify-end mb-3 sm:mb-4 -mt-2 -mr-2">
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="text-[#777682] hover:text-[#ba1a1a] flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto gap-0 sm:gap-1 font-bold text-[13px] transition-colors bg-white sm:px-3 sm:py-1.5 rounded-full sm:rounded border border-[#e0e2eb] shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px] sm:text-[16px]">close</span> <span className="hidden sm:inline">Close</span>
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 sm:gap-5">
                            {/* 1. Header Progress Card */}
                            <div className="bg-white rounded-lg border border-[#e0e2eb] p-4 sm:p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
                                    <div>
                                        <h1 className="text-[20px] sm:text-[28px] font-bold text-[#222777] tracking-tight">Project Submission Form</h1>
                                        <p className="text-[13px] sm:text-[14px] text-[#464651] mt-1 leading-relaxed">Complete the fields below to submit your research findings for peer review.</p>
                                    </div>
                                    <span className="bg-[#ffefeb] text-[#e06c43] font-mono text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded border border-[#ffefeb] flex items-center gap-1 shrink-0 w-fit">
                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                        Due: Oct 24
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between font-mono text-[10px] sm:text-[11px] text-[#777682] font-bold uppercase tracking-wider">
                                        <span>Progress</span>
                                        <span>{completedFields} of {totalFields} completed</span>
                                    </div>
                                    <div className="w-full bg-[#ebeef6] h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-[#222777] h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${(completedFields / totalFields) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Researcher Name Field */}
                            <div className="bg-white rounded-lg border border-[#e0e2eb] p-4 sm:p-6 shadow-sm">
                                <label className="block font-mono text-[11px] font-bold text-[#181c22] mb-2 sm:mb-3 uppercase tracking-wider">
                                    Researcher Name <span className="text-[#ba1a1a] font-sans">*</span>
                                </label>
                                <input
                                    type="text" value={researcherName} onChange={(e) => setResearcherName(e.target.value)}
                                    className="w-full border border-[#c7c5d3] rounded p-2.5 sm:p-3 text-[14px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none"
                                />
                            </div>

                            {/* 3. Project Category Dropdown */}
                            <div className="bg-white rounded-lg border border-[#e0e2eb] p-4 sm:p-6 shadow-sm">
                                <label className="block font-mono text-[11px] font-bold text-[#181c22] mb-2 sm:mb-3 uppercase tracking-wider">
                                    Project Category
                                </label>
                                <div className="relative">
                                    <select
                                        value={projectCategory} onChange={(e) => setProjectCategory(e.target.value)}
                                        className="w-full appearance-none border border-[#c7c5d3] rounded p-2.5 sm:p-3 pr-10 text-[14px] text-[#181c22] bg-white focus:border-[#222777] outline-none cursor-pointer"
                                    >
                                        <option>AI Ethics</option>
                                        <option>Quantum Machine Learning</option>
                                        <option>Natural Language Processing</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            {/* 4. Submission ID Field */}
                            <div className="bg-white rounded-lg border border-[#e0e2eb] p-4 sm:p-6 shadow-sm">
                                <label className="block font-mono text-[11px] font-bold text-[#181c22] mb-2 sm:mb-3 uppercase tracking-wider">
                                    Submission ID <span className="text-[#ba1a1a] font-sans">*</span>
                                </label>
                                <input
                                    type="text" value={submissionId} onChange={(e) => setSubmissionId(e.target.value)}
                                    className="w-full border border-[#c7c5d3] rounded p-2.5 sm:p-3 text-[14px] font-mono text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none placeholder:text-[#c7c5d3]"
                                    placeholder="#e.g., RES-2023-XYZ"
                                />
                            </div>

                            {/* 5. AI-Assisted Research Summary Voice Field */}
                            <div className="bg-white rounded-lg border border-[#e0e2eb] p-4 sm:p-6 border-l-[3px] border-l-[#6bf6ff] shadow-sm">
                                <div className="flex justify-between items-start sm:items-center mb-2 gap-2">
                                    <label className="block font-mono text-[11px] font-bold text-[#181c22] uppercase tracking-wider">
                                        Research Summary <span className="text-[#ba1a1a] font-sans">*</span>
                                    </label>
                                    <span className="bg-[#e0e0ff] text-[#222777] font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded tracking-wider flex items-center gap-1 shrink-0">
                                        <span className="material-symbols-outlined text-[12px] sm:text-[14px]">psychology</span> <span className="hidden sm:inline">AI ASSISTED</span>
                                    </span>
                                </div>
                                <p className="text-[12px] sm:text-[13px] italic text-[#777682] mb-3 sm:mb-4 leading-relaxed">"Please describe your primary findings and methodology."</p>

                                <div className="border border-[#e0e2eb] rounded bg-[#f9f9ff] flex flex-col">
                                    <div className="flex items-center gap-3 sm:gap-4 border-b border-[#e0e2eb] p-3 sm:p-4 bg-white/50 rounded-t">
                                        <button
                                            onClick={() => setIsRecording(!isRecording)}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${isRecording ? 'bg-[#ba1a1a] text-white animate-pulse' : 'bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white'}`}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">{isRecording ? 'stop' : 'mic'}</span>
                                        </button>

                                        {/* Waveform */}
                                        <div className="flex-1 flex items-center gap-[2px] sm:gap-[3px] h-6 overflow-hidden justify-center max-w-[200px] sm:max-w-none mx-auto">
                                            {[3, 5, 8, 4, 6, 9, 7, 5, 8, 4, 6, 2, 5, 7, 4, 8, 5, 9, 3, 6, 4].map((bar, i) => (
                                                <div key={i} className="w-[2px] sm:w-[3px] bg-[#6bf6ff] rounded-full transition-all duration-150" style={{ height: isRecording ? `${Math.max(20, Math.random() * 100)}%` : '4px', opacity: isRecording ? 1 : 0.6 }}></div>
                                            ))}
                                        </div>
                                        <span className="font-mono text-[11px] font-bold text-[#ba1a1a] pr-1 sm:pr-2 shrink-0">0:14</span>
                                    </div>
                                    <textarea
                                        value={researchSummary} onChange={(e) => setResearchSummary(e.target.value)}
                                        className="w-full h-24 sm:h-28 bg-transparent border-none p-3 sm:p-4 text-[13px] sm:text-[14px] text-[#464651] leading-relaxed outline-none resize-none"
                                    />
                                </div>
                            </div>

                            {/* 6. Data Sources Checkboxes */}
                            <div className="bg-white rounded-lg border border-[#e0e2eb] p-4 sm:p-6 shadow-sm">
                                <label className="block font-mono text-[11px] font-bold text-[#181c22] mb-3 sm:mb-4 uppercase tracking-wider">
                                    Data Sources Used <span className="font-sans normal-case font-normal text-[#777682] hidden sm:inline">(Select all that apply)</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    {Object.keys(dataSources).map((key) => (
                                        <label key={key} className="flex items-center gap-3 p-1 cursor-pointer">
                                            <input type="checkbox" checked={dataSources[key]} onChange={() => setDataSources(prev => ({ ...prev, [key]: !prev[key] }))} className="w-4 h-4 text-[#222777] border-[#c7c5d3] rounded focus:ring-[#222777]" />
                                            <span className="text-[13px] sm:text-[14px] text-[#181c22] font-medium capitalize leading-tight">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* 7. Dropzone */}
                            <div className="bg-white rounded-lg border border-[#e0e2eb] p-4 sm:p-6 shadow-sm">
                                <label className="block font-mono text-[11px] font-bold text-[#181c22] mb-2 sm:mb-3 uppercase tracking-wider">
                                    Supplementary Materials <span className="text-[#777682] normal-case font-sans">(Optional)</span>
                                </label>
                                <div onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop} className="border-2 border-dashed border-[#c7c5d3] rounded-lg p-6 sm:p-8 flex flex-col items-center justify-center gap-2 sm:gap-3 bg-[#f9f9ff] relative cursor-pointer hover:border-[#222777] transition-colors">
                                    <input type="file" multiple onChange={handleFileDrop} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                                    <div className="w-10 h-10 rounded bg-[#e0e0ff] flex items-center justify-center text-[#222777] shrink-0"><span className="material-symbols-outlined text-[20px]">cloud_upload</span></div>
                                    <div className="text-center">
                                        <p className="text-[13px] sm:text-[14px] font-bold text-[#222777] mb-1">Click to upload or drag and drop</p>
                                        <p className="font-mono text-[10px] text-[#777682] uppercase tracking-wider">PDF, ZIP, or CSV (max. 50MB)</p>
                                    </div>
                                </div>
                            </div>

                            {/* 8. Action Footer */}
                            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-2">
                                <button onClick={() => setIsFormOpen(false)} className="w-full sm:w-auto px-8 py-2.5 sm:py-3 bg-white border border-[#c7c5d3] rounded text-[13px] sm:text-[14px] font-bold text-[#464651] hover:bg-[#f1f3fc] transition-colors shadow-sm">
                                    Save Draft
                                </button>
                                <button onClick={handleFormSubmit} className="w-full sm:w-auto px-8 py-2.5 sm:py-3 bg-[#222777] rounded text-[13px] sm:text-[14px] font-bold text-white hover:bg-[#3a3f8f] transition-colors flex justify-center items-center gap-2 shadow-sm">
                                    Submit Form <span className="material-symbols-outlined text-[16px] sm:text-[18px]">send</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}