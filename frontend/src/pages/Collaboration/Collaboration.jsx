import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import QRCode from 'qrcode';
import VoiceRecorder from '../../components/VoiceRecorder';
import api from '../../services/api';

const NETWORK_STATUS_CLASSES = {
    approved: 'bg-[#e6fbfc] text-[#006e73]',
    rejected: 'bg-[#ffdad6] text-[#ba1a1a]',
    pending: '!border-[#c7c5d3] text-[#777682] bg-white'
};

function NetworkNode({ node }) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const initials = (node.user.fullName || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const status = node.reward?.approvalStatus || 'pending';

    return (
        <div className="border border-[#e0e2eb] rounded-lg">
            <div className="flex items-center justify-between p-3 sm:p-4">
                <div className="flex items-center gap-3">
                    {hasChildren ? (
                        <button onClick={() => setExpanded(e => !e)} className="text-[#777682] hover:text-[#222777] transition-colors">
                            <span className="material-symbols-outlined text-[20px]">{expanded ? 'expand_more' : 'chevron_right'}</span>
                        </button>
                    ) : (
                        <span className="w-5" />
                    )}
                    <div className="w-8 h-8 rounded-full bg-[#e0e0ff] text-[#222777] flex items-center justify-center text-[11px] font-bold shrink-0">{initials}</div>
                    <div>
                        <p className="font-bold text-[#181c22] text-[13px] sm:text-[14px]">{node.user.fullName}</p>
                        <p className="text-[11px] text-[#777682] font-mono">L{node.level} • {new Date(node.user.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {node.reward && (
                        <span className="font-mono text-[12px] font-bold text-[#00c2cb]">{node.reward.coinAmount} coins</span>
                    )}
                    <span className={`inline-flex items-center text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider border border-transparent ${NETWORK_STATUS_CLASSES[status]}`}>
                        {status}
                    </span>
                </div>
            </div>
            {hasChildren && expanded && (
                <div className="pl-6 sm:pl-8 pb-3 sm:pb-4 pr-3 sm:pr-4 space-y-2">
                    {node.children.map(child => <NetworkNode key={child.user._id} node={child} />)}
                </div>
            )}
        </div>
    );
}

export default function Collaboration() {
    const token = useSelector(state => state.auth?.accessToken);
    const user = useSelector(state => state.auth?.user || {});
    
    // --- STATE: REFERRALS ---
    const [isCopied, setIsCopied] = useState(false);
    const referralCode = user.referralCode || 'welcome';
    const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/join?ref=${referralCode}` : `https://thinkmic.com/join?ref=${referralCode}`;
    const qrCanvasRef = useRef(null);

    useEffect(() => {
        if (qrCanvasRef.current) {
            QRCode.toCanvas(qrCanvasRef.current, referralLink, {
                width: 256,
                margin: 1,
                color: { dark: '#222777', light: '#f1f3fc' }
            }).then(() => {
                // QRCode.toCanvas sets inline width/height styles matching the pixel
                // buffer size (256px) - override them so the canvas still scales down
                // to fit its small container instead of overflowing it.
                if (qrCanvasRef.current) {
                    qrCanvasRef.current.style.width = '100%';
                    qrCanvasRef.current.style.height = '100%';
                }
            });
        }
    }, [referralLink]);

    const handleDownloadQr = () => {
        if (!qrCanvasRef.current) return;
        const link = document.createElement('a');
        link.download = `thinkmic-referral-${referralCode}.png`;
        link.href = qrCanvasRef.current.toDataURL('image/png');
        link.click();
    };
    const [stats, setStats] = useState({
        totalReferrals: 0, l1Count: 0, l2Count: 0, l3Count: 0,
        pendingCoins: 0, approvedCoins: 0, rejectedCoins: 0,
        lifetimeReferralCoins: 0, conversionRate: 0
    });
    const [recentReferrals, setRecentReferrals] = useState([]);
    const [pendingRewards, setPendingRewards] = useState([]);
    const [network, setNetwork] = useState([]);

    // Custom Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    // Fetch Referrals from Backend
    useEffect(() => {
        if (!token) return;
        const fetchReferrals = async () => {
            try {
                const res = await api.get('/collaboration/referrals');
                const data = res.data;
                if (data.stats) {
                    setStats(data.stats);
                    setRecentReferrals(data.recentReferrals || []);
                    setPendingRewards(data.pendingRewards || []);
                }
            } catch (err) {
                console.error("Failed to fetch referrals", err);
            }
        };
        fetchReferrals();
    }, [token]);

    // Fetch Referral Network (up to L3)
    useEffect(() => {
        if (!token) return;
        const fetchNetwork = async () => {
            try {
                const res = await api.get('/collaboration/referrals/network');
                setNetwork(res.data.network || []);
            } catch (err) {
                console.error("Failed to fetch referral network", err);
            }
        };
        fetchNetwork();
    }, [token]);

    const statusBadgeClasses = (status) => {
        if (status === 'approved') return 'bg-[#e6fbfc] text-[#006e73]';
        if (status === 'rejected') return 'bg-[#ffdad6] text-[#ba1a1a]';
        return '!border-[#c7c5d3] text-[#777682] bg-white'; // pending
    };
    const statusIcon = (status) => {
        if (status === 'approved') return 'check_circle';
        if (status === 'rejected') return 'cancel';
        return 'hourglass_empty';
    };

    // --- STATE: DYNAMIC FORM ---
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [schemas, setSchemas] = useState([]);
    const [selectedSchema, setSelectedSchema] = useState(null);
    const [answers, setAnswers] = useState({});
    const [isSubmittedState, setIsSubmittedState] = useState(false); // Full-page success state

    // Fetch Active Schemas
    useEffect(() => {
        if (!token) return;
        const fetchSchemas = async () => {
            try {
                const res = await api.get('/schemas/forms');
                const data = res.data;
                if (data.forms) {
                    setSchemas(data.forms);
                    if (data.forms.length > 0) setSelectedSchema(data.forms[0]);
                }
            } catch (err) {
                console.error("Failed to fetch schemas", err);
            }
        };
        fetchSchemas();
    }, [token]);

    const handleAnswerChange = (fieldId, value) => {
        setAnswers(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleCheckboxChange = (fieldId, option) => {
        setAnswers(prev => {
            const currentOptions = prev[fieldId] || [];
            if (currentOptions.includes(option)) {
                return { ...prev, [fieldId]: currentOptions.filter(o => o !== option) };
            } else {
                return { ...prev, [fieldId]: [...currentOptions, option] };
            }
        });
    };

    // --- PROGRESS TRACKING ENGINE ---
    const [completedFields, setCompletedFields] = useState(0);
    const totalFields = selectedSchema?.fields?.length || 0;

    useEffect(() => {
        if (!selectedSchema) return;
        let count = 0;
        selectedSchema.fields.forEach(field => {
            const answer = answers[field.id];
            if (answer && (Array.isArray(answer) ? answer.length > 0 : answer.toString().trim() !== '')) {
                count++;
            }
        });
        setCompletedFields(count);
    }, [answers, selectedSchema]);

    // --- HANDLERS ---
    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const REFERRAL_SHARE_TEXT = "Join me on ThinkMic - the AI research and audio intelligence platform:";
    const handleShareEmail = () => {
        window.location.href = `mailto:?subject=${encodeURIComponent('Join me on ThinkMic')}&body=${encodeURIComponent(`${REFERRAL_SHARE_TEXT}\n\n${referralLink}`)}`;
    };
    const handleShareChat = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${REFERRAL_SHARE_TEXT} ${referralLink}`)}`, '_blank', 'noopener,noreferrer');
    };

    const handleFormSubmit = async () => {
        if (!selectedSchema) return;

        // Basic validation for required fields
        const missingRequired = selectedSchema.fields.some(f => f.required && (!answers[f.id] || (Array.isArray(answers[f.id]) && answers[f.id].length === 0)));
        if (missingRequired) {
            return showToast("Please fill out all required fields.", "error");
        }
        
        try {
            // Map answers to the format expected by backend (which expects { type, value })
            const formattedAnswers = {};
            selectedSchema.fields.forEach(f => {
                formattedAnswers[f.id] = {
                    type: f.type.toLowerCase() === 'voice' ? 'voice' : 'text',
                    value: Array.isArray(answers[f.id]) ? answers[f.id].join(', ') : (answers[f.id] || '')
                };
            });

            const response = await api.post('/submissions', {
                schemaId: selectedSchema._id,
                answers: formattedAnswers,
                status: 'submitted'
            });

            if (response.status === 201 || response.status === 200) {
                // Show full page success
                setIsSubmittedState(true);
            } else {
                showToast("Failed to submit form.", "error");
            }
        } catch (error) {
            console.error("Submission failed", error);
            showToast("An error occurred during submission.", "error");
        }
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-y-auto relative font-sans custom-scrollbar">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="w-full p-4 sm:p-6 md:p-8 flex flex-col gap-6 pb-20 animate-in fade-in duration-300">

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
                        <div className="flex items-baseline gap-2">
                            <span className="text-[28px] sm:text-[32px] font-bold text-[#222777] leading-none">{stats.totalReferrals}</span>
                            <span className="text-[11px] sm:text-[12px] font-bold text-[#777682]">{stats.conversionRate}% conversion</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-auto sm:h-[120px] gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[#777682] gap-1 sm:gap-0">
                            <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">L1 Referrals</span>
                            <span className="material-symbols-outlined text-[16px] sm:text-[20px] hidden sm:block">looks_one</span>
                        </div>
                        <span className="text-[28px] sm:text-[32px] font-bold text-[#222777] leading-none">{stats.l1Count}</span>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-auto sm:h-[120px] gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[#777682] gap-1 sm:gap-0">
                            <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">L2 Referrals</span>
                            <span className="material-symbols-outlined text-[16px] sm:text-[20px] hidden sm:block">looks_two</span>
                        </div>
                        <span className="text-[28px] sm:text-[32px] font-bold text-[#222777] leading-none">{stats.l2Count}</span>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-auto sm:h-[120px] gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[#777682] gap-1 sm:gap-0">
                            <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">L3 Referrals</span>
                            <span className="material-symbols-outlined text-[16px] sm:text-[20px] hidden sm:block">looks_3</span>
                        </div>
                        <span className="text-[28px] sm:text-[32px] font-bold text-[#222777] leading-none">{stats.l3Count}</span>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-auto sm:h-[120px] gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[#777682] gap-1 sm:gap-0">
                            <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">Pending Coins</span>
                            <span className="material-symbols-outlined text-[16px] sm:text-[20px] hidden sm:block">hourglass_empty</span>
                        </div>
                        <span className="text-[28px] sm:text-[32px] font-bold text-[#00c2cb] leading-none">{stats.pendingCoins.toLocaleString()}</span>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-auto sm:h-[120px] gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[#777682] gap-1 sm:gap-0">
                            <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">Approved Coins</span>
                            <span className="material-symbols-outlined text-[16px] sm:text-[20px] hidden sm:block">toll</span>
                        </div>
                        <span className="text-[28px] sm:text-[32px] font-bold text-[#00c2cb] leading-none">{stats.approvedCoins.toLocaleString()}</span>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-auto sm:h-[120px] gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[#777682] gap-1 sm:gap-0">
                            <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">Rejected Coins</span>
                            <span className="material-symbols-outlined text-[16px] sm:text-[20px] hidden sm:block">cancel</span>
                        </div>
                        <span className="text-[28px] sm:text-[32px] font-bold text-[#ba1a1a] leading-none">{stats.rejectedCoins.toLocaleString()}</span>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-auto sm:h-[120px] gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[#777682] gap-1 sm:gap-0">
                            <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">Lifetime Referral Coins</span>
                            <span className="material-symbols-outlined text-[16px] sm:text-[20px] hidden sm:block">military_tech</span>
                        </div>
                        <span className="text-[28px] sm:text-[32px] font-bold text-[#222777] leading-none">{stats.lifetimeReferralCoins.toLocaleString()}</span>
                    </div>
                </div>

                {/* Pending Coins Panel */}
                {pendingRewards.length > 0 && (
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] overflow-hidden w-full flex flex-col">
                        <div className="p-4 sm:p-6 border-b border-[#e0e2eb]">
                            <h3 className="text-[18px] sm:text-[20px] font-bold text-[#222777]">Pending Coins</h3>
                        </div>
                        <div className="overflow-x-auto w-full custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                <tr className="bg-[#f9f9ff] border-b border-[#e0e2eb] text-[11px] sm:text-[12px] font-bold text-[#777682] uppercase tracking-wider whitespace-nowrap">
                                    <th className="py-3 px-4 sm:px-6">Referral</th>
                                    <th className="py-3 px-4 sm:px-6">Level</th>
                                    <th className="py-3 px-4 sm:px-6">Registered</th>
                                    <th className="py-3 px-4 sm:px-6">Status</th>
                                    <th className="py-3 px-4 sm:px-6 text-right">Coins</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e0e2eb] text-[13px] sm:text-[14px]">
                                {pendingRewards.map((r) => (
                                    <tr key={r._id} className="hover:bg-[#f9f9ff] transition-colors">
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 font-bold text-[#181c22] whitespace-nowrap">{r.referredName}</td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 font-mono text-[11px] sm:text-[12px] text-[#464651]">L{r.level}</td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 font-mono text-[11px] sm:text-[12px] text-[#464651] whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2.5 py-1 rounded font-bold uppercase tracking-wider border border-transparent ${statusBadgeClasses(r.approvalStatus)}`}>
                                                <span className="material-symbols-outlined text-[12px] sm:text-[14px]">{statusIcon(r.approvalStatus)}</span>
                                                {r.approvalStatus}
                                            </span>
                                        </td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-right font-mono font-bold text-[13px] sm:text-[14px] text-[#00c2cb] whitespace-nowrap">{r.coinAmount}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

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
                            <button onClick={handleShareEmail} title="Share via Email" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#f1f3fc] border border-[#c7c5d3] text-[#222777] hover:bg-[#e0e2eb] flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-[18px] sm:text-[20px]">mail</span></button>
                            <button onClick={handleShareChat} title="Share via WhatsApp" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#f1f3fc] border border-[#c7c5d3] text-[#222777] hover:bg-[#e0e2eb] flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-[18px] sm:text-[20px]">chat</span></button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center">
                        <h3 className="text-[18px] sm:text-[20px] font-bold text-[#222777] mb-4 sm:mb-6">Quick Scan</h3>
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#f1f3fc] border border-[#e0e2eb] rounded-lg mb-4 p-2 flex items-center justify-center">
                            <canvas ref={qrCanvasRef} className="w-full h-full" />
                        </div>
                        <p className="text-[11px] sm:text-[12px] font-bold text-[#777682] mb-3 sm:mb-4">Let colleagues scan to join instantly.</p>
                        <button onClick={handleDownloadQr} className="text-[#222777] text-[13px] sm:text-[14px] font-bold hover:text-[#00c2cb] transition-colors flex items-center justify-center w-full sm:w-auto gap-1">
                            <span className="material-symbols-outlined text-[18px]">download</span> Download PNG
                        </button>
                    </div>
                </div>

                {/* Referrals Table */}
                <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] overflow-hidden w-full flex flex-col">
                    <div className="flex justify-between items-center p-4 sm:p-6 border-b border-[#e0e2eb]">
                        <h3 className="text-[18px] sm:text-[20px] font-bold text-[#222777]">Recent Referrals</h3>
                    </div>
                    <div className="overflow-x-auto w-full custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                            <tr className="bg-[#f9f9ff] border-b border-[#e0e2eb] text-[11px] sm:text-[12px] font-bold text-[#777682] uppercase tracking-wider whitespace-nowrap">
                                <th className="py-3 px-4 sm:px-6">User</th>
                                <th className="py-3 px-4 sm:px-6">Level</th>
                                <th className="py-3 px-4 sm:px-6">Date Registered</th>
                                <th className="py-3 px-4 sm:px-6">Status</th>
                                <th className="py-3 px-4 sm:px-6 text-right">Rewards</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e0e2eb] text-[13px] sm:text-[14px]">
                            {recentReferrals.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-[#777682] text-[13px]">No referrals yet.</td></tr>
                            ) : recentReferrals.map((r) => {
                                const initials = (r.referredName || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                return (
                                    <tr key={r._id} className="hover:bg-[#f9f9ff] transition-colors">
                                        <td className="py-3 sm:py-4 px-4 sm:px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded flex items-center justify-center text-[11px] sm:text-[12px] font-bold shrink-0 bg-[#e0e0ff] text-[#222777]">{initials}</div>
                                                <span className="font-bold text-[#181c22] whitespace-nowrap">{r.referredName}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 font-mono text-[11px] sm:text-[12px] text-[#464651]">L{r.level}</td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 font-mono text-[11px] sm:text-[12px] text-[#464651] whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2.5 py-1 rounded font-bold uppercase tracking-wider border border-transparent ${statusBadgeClasses(r.approvalStatus)}`}>
                                                <span className="material-symbols-outlined text-[12px] sm:text-[14px]">{statusIcon(r.approvalStatus)}</span>
                                                {r.approvalStatus}
                                            </span>
                                        </td>
                                        <td className={`py-3 sm:py-4 px-4 sm:px-6 text-right font-mono font-bold text-[13px] sm:text-[14px] whitespace-nowrap ${r.approvalStatus === 'approved' ? 'text-[#00c2cb]' : 'text-[#777682]'}`}>{r.coinAmount}</td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Referral Network */}
                <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] overflow-hidden w-full flex flex-col">
                    <div className="p-4 sm:p-6 border-b border-[#e0e2eb]">
                        <h3 className="text-[18px] sm:text-[20px] font-bold text-[#222777]">Referral Network</h3>
                        <p className="text-[12px] sm:text-[13px] text-[#777682] mt-1">Your referral hierarchy, up to 3 levels deep.</p>
                    </div>
                    <div className="p-4 sm:p-6 space-y-2">
                        {network.length === 0 ? (
                            <div className="text-center py-6 text-[#777682] text-[13px]">No referral network yet.</div>
                        ) : (
                            network.map(node => <NetworkNode key={node.user._id} node={node} />)
                        )}
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* --- RESEARCH SUBMISSION FORM OVERLAY --- */}
            {/* ========================================================================= */}

            <div className={`fixed inset-0 bg-[#2d3037]/90 backdrop-blur-sm z-50 overflow-y-auto flex justify-center items-start transition-opacity duration-300 ${isFormOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} p-4`}>
                <div className={`relative w-full max-w-[760px] my-4 sm:my-8 transition-all duration-300 ${isFormOpen ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'}`}>

                    {isSubmittedState ? (
                        <div className="bg-white rounded-xl shadow-2xl flex flex-col items-center justify-center p-12 sm:p-20 text-center min-h-[500px] animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-[#e6fbfc] rounded-full flex items-center justify-center mb-6 text-[#00c2cb] animate-bounce">
                                <span className="material-symbols-outlined text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </div>
                            <h2 className="text-[32px] font-bold text-[#222777] mb-4">Thank you for your submission</h2>
                            <p className="text-[16px] text-[#464651] mb-8 max-w-md">Your research has been successfully submitted and added to the peer review queue. We appreciate your contribution!</p>
                            <button
                                onClick={() => { setIsSubmittedState(false); setIsFormOpen(false); setAnswers({}); }}
                                className="px-8 py-3 bg-[#222777] text-white font-bold rounded-lg hover:bg-[#3a3f8f] transition-colors shadow-md text-[14px]"
                            >
                                Back to Forms
                            </button>
                        </div>
                    ) : (
                        <div className="bg-[#f9f9ff] rounded-xl shadow-2xl flex flex-col p-4 sm:p-6">
                            <div className="flex justify-end mb-3 sm:mb-4 -mt-2 -mr-2">
                                <button
                                    onClick={() => setIsFormOpen(false)}
                                    className="text-[#777682] hover:text-[#ba1a1a] flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto gap-0 sm:gap-1 font-bold text-[13px] transition-colors bg-white sm:px-3 sm:py-1.5 rounded-full sm:rounded border border-[#e0e2eb] shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[18px] sm:text-[16px]">close</span> <span className="hidden sm:inline">Close</span>
                                </button>
                            </div>

                            <div className="flex flex-col gap-4 sm:gap-5">
                                <div className="bg-white rounded-lg border border-[#e0e2eb] p-4 sm:p-6 shadow-sm">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
                                        <div>
                                            <h1 className="text-[20px] sm:text-[28px] font-bold text-[#222777] tracking-tight">{selectedSchema?.name || 'Form Submission'}</h1>
                                            <p className="text-[13px] sm:text-[14px] text-[#464651] mt-1 leading-relaxed">Complete the fields below to submit.</p>
                                        </div>
                                        {schemas.length > 1 && (
                                            <select
                                                value={selectedSchema?._id || ''}
                                                onChange={(e) => setSelectedSchema(schemas.find(s => s._id === e.target.value))}
                                                className="border border-[#c7c5d3] rounded-md p-2 text-[12px] font-bold text-[#181c22] outline-none cursor-pointer bg-white"
                                            >
                                                {schemas.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                            </select>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between font-mono text-[10px] sm:text-[11px] text-[#777682] font-bold uppercase tracking-wider">
                                            <span>Progress</span>
                                            <span>{completedFields} of {totalFields} completed</span>
                                        </div>
                                        <div className="w-full bg-[#ebeef6] h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-[#222777] h-full rounded-full transition-all duration-500 ease-out" style={{ width: totalFields ? `${(completedFields / totalFields) * 100}%` : '0%' }}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Fields Render */}
                                {selectedSchema?.fields?.map((field) => (
                                    <div key={field.id} className={`bg-white rounded-lg border border-[#e0e2eb] p-4 sm:p-6 shadow-sm ${field.type.toLowerCase() === 'voice' ? 'border-l-[3px] border-l-[#6bf6ff]' : ''}`}>
                                        <label className="block font-mono text-[11px] font-bold text-[#181c22] mb-2 uppercase tracking-wider">
                                            {field.label} {field.required && <span className="text-[#ba1a1a] font-sans">*</span>}
                                        </label>

                                        {/* Field Types Routing */}
                                        {field.type.toLowerCase() === 'text' && (
                                            <input type="text" value={answers[field.id] || ''} onChange={(e) => handleAnswerChange(field.id, e.target.value)} className="w-full border border-[#c7c5d3] rounded p-2.5 text-[14px] outline-none focus:border-[#222777]" />
                                        )}
                                        {field.type.toLowerCase() === 'textarea' && (
                                            <textarea value={answers[field.id] || ''} onChange={(e) => handleAnswerChange(field.id, e.target.value)} className="w-full border border-[#c7c5d3] rounded p-2.5 text-[14px] outline-none focus:border-[#222777] h-24 resize-none" />
                                        )}
                                        {field.type.toLowerCase() === 'select' && (
                                            <select value={answers[field.id] || ''} onChange={(e) => handleAnswerChange(field.id, e.target.value)} className="w-full border border-[#c7c5d3] rounded p-2.5 text-[14px] outline-none focus:border-[#222777] cursor-pointer bg-white">
                                                <option value="">Select an option</option>
                                                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        )}
                                        {field.type.toLowerCase() === 'checkbox' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                {field.options?.map(opt => (
                                                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                                        <input type={field.allowMultiple === false ? "radio" : "checkbox"} name={`field_${field.id}`} checked={(answers[field.id] || []).includes(opt)} onChange={() => {
                                                            if (field.allowMultiple === false) {
                                                                handleAnswerChange(field.id, [opt]);
                                                            } else {
                                                                handleCheckboxChange(field.id, opt);
                                                            }
                                                        }} className={`w-4 h-4 text-[#222777] ${field.allowMultiple === false ? 'rounded-full' : ''}`} />
                                                        <span className="text-[14px] text-[#181c22]">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        {field.type.toLowerCase() === 'voice' && (
                                            <VoiceRecorder
                                                value={answers[field.id] || ''}
                                                onChange={(val) => handleAnswerChange(field.id, val)}
                                                prompt={field.prompt}
                                            />
                                        )}
                                        {field.type.toLowerCase() === 'date' && (
                                            <input type="date" value={answers[field.id] || ''} onChange={(e) => handleAnswerChange(field.id, e.target.value)} className="border border-[#c7c5d3] rounded p-2 text-[14px] outline-none focus:border-[#222777]" />
                                        )}
                                        {field.type.toLowerCase() === 'number' && (
                                            <input type="number" value={answers[field.id] || ''} onChange={(e) => handleAnswerChange(field.id, e.target.value)} className="w-full border border-[#c7c5d3] rounded p-2.5 text-[14px] outline-none focus:border-[#222777]" />
                                        )}
                                        {field.type.toLowerCase() === 'rating' && (
                                            <div className="flex gap-2">
                                                {[1,2,3,4,5].map(star => (
                                                    <button key={star} onClick={() => handleAnswerChange(field.id, star)} className={`material-symbols-outlined text-[28px] ${(answers[field.id] >= star) ? 'text-[#e06c43]' : 'text-[#c7c5d3]'}`} style={{ fontVariationSettings: (answers[field.id] >= star) ? "'FILL' 1" : "'FILL' 0" }}>star</button>
                                                ))}
                                            </div>
                                        )}
                                        {field.type.toLowerCase() === 'file' && (
                                            <input type="file" className="text-[13px] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#f1f3fc] file:text-[#222777] hover:file:bg-[#e0e2eb]" />
                                        )}
                                    </div>
                                ))}

                                {/* Action Footer */}
                                <div className="flex justify-center gap-3 mt-4">
                                    <button onClick={() => setIsFormOpen(false)} className="px-8 py-2.5 bg-white border border-[#c7c5d3] rounded text-[13px] font-bold text-[#464651]">Cancel</button>
                                    <button onClick={handleFormSubmit} className="px-8 py-2.5 bg-[#222777] rounded text-[13px] font-bold text-white shadow-sm flex items-center gap-2">Submit Form <span className="material-symbols-outlined text-[16px]">send</span></button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* --- CUSTOM TOAST NOTIFICATION --- */}
            <div className={`fixed bottom-24 right-6 z-50 transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${toast.type === 'error' ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]' : 'bg-[#e6fbfc] border-[#00c2cb] text-[#006e73]'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <span className="text-[13px] sm:text-[14px] font-bold">
                        {toast.message}
                    </span>
                    <button onClick={() => setToast(prev => ({...prev, show: false}))} className="ml-2 hover:opacity-70">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>
        </div>
    );
}