import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const STATUS_META = {
    transcribed: { label: 'Transcribed', className: 'bg-[#FEF9C3] text-[#006e73] border-[#6bf6ff]/50' },
    processing: { label: 'Processing', className: 'bg-[#fff8e1] text-[#b45309] border-[#ffe082]' },
    uploaded: { label: 'Uploaded', className: 'bg-[#f1f3fc] text-[#464651] border-[#e0e2eb]' },
    failed: { label: 'Failed', className: 'bg-[#ffdad6] text-[#ba1a1a] border-[#ffb4ab]' }
};

function formatRelativeDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// "Recent sessions" history - every past recording (transcript + summary + the research
// queries extracted from it) in one scannable list, like a chat app's recent-conversations
// sidebar page, so a user can find and resume any past session without hunting through
// individual projects.
export default function SessionHistory() {
    const navigate = useNavigate();
    const accessToken = useSelector((state) => state.auth?.accessToken);

    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        if (!accessToken) return;
        const fetchHistory = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const res = await api.get('/recordings/history');
                setHistory(res.data.history || []);
            } catch (err) {
                setLoadError(err.response?.data?.message || 'Failed to load session history.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [accessToken]);

    const handleOpenSession = (recordingId) => {
        navigate(`/app/research?recordingId=${recordingId}`);
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar bg-[#F4F9F8] font-sans">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 pb-12">
                <header className="mb-6 sm:mb-8">
                    <h1 className="text-[28px] sm:text-[32px] md:text-[40px] font-bold text-[#075e51] leading-[1.2] tracking-tight">Session History</h1>
                    <p className="text-[14px] sm:text-[16px] text-[#464651] mt-1 sm:mt-2 max-w-2xl">Every past recording, its transcript, summary, and the research queries it generated - pick one up where you left off.</p>
                </header>

                {isLoading ? (
                    <div className="space-y-3">
                        {[0, 1, 2].map((i) => <div key={i} className="h-40 bg-white rounded-xl border border-[#e0e2eb] animate-pulse" />)}
                    </div>
                ) : loadError ? (
                    <div className="text-center py-20">
                        <span className="material-symbols-outlined text-4xl text-[#c7c5d3] mb-2">error_outline</span>
                        <p className="font-bold text-[#464651]">{loadError}</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="bg-white rounded-xl border-2 border-dashed border-[#e0e2eb] p-10 sm:p-14 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#f1f3fc] flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-[28px] text-[#c7c5d3]">history</span>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#181c22] mb-1.5">No sessions yet</h3>
                        <p className="text-[14px] text-[#777682] max-w-sm mx-auto">Record or upload audio in Projects to start building your session history.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((session) => {
                            const statusMeta = STATUS_META[session.status] || STATUS_META.uploaded;
                            return (
                                <button
                                    key={session._id}
                                    onClick={() => handleOpenSession(session._id)}
                                    className="w-full text-left bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 sm:p-6 hover:border-[#c7c5d3] hover:shadow-[0_2px_10px_rgba(58,63,143,0.1)] transition-all"
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="w-9 h-9 rounded-full bg-[#eef0f9] text-[#075e51] flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-[18px]">mic</span>
                                            </span>
                                            <h3 className="font-bold text-[15px] sm:text-[16px] text-[#181c22] truncate">{session.title || 'Untitled Recording'}</h3>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusMeta.className}`}>
                                                {statusMeta.label}
                                            </span>
                                            <span className="text-[11px] font-mono text-[#777682] whitespace-nowrap">{formatRelativeDate(session.createdAt)}</span>
                                        </div>
                                    </div>

                                    {session.transcriptSnippet && (
                                        <p className="text-[13px] text-[#464651] leading-relaxed mb-2 line-clamp-2">
                                            <span className="font-bold text-[#777682]">Transcript: </span>{session.transcriptSnippet}
                                        </p>
                                    )}
                                    {session.summarySnippet && (
                                        <p className="text-[13px] text-[#006e73] leading-relaxed mb-3 line-clamp-2 italic">
                                            <span className="font-bold not-italic">Summary: </span>{session.summarySnippet}
                                        </p>
                                    )}

                                    {(session.tags?.length > 0 || session.queries?.length > 0) && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {session.tags?.map((tag) => (
                                                <span key={tag} className="inline-flex items-center gap-1 bg-[#f1f3fc] text-[#464651] text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#e0e2eb]">
                                                    {tag}
                                                </span>
                                            ))}
                                            {session.queries?.map((q, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 bg-[#FEF9C3] text-[#006e73] text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#6bf6ff]/50">
                                                    <span className="material-symbols-outlined text-[12px]">search</span>{q}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
