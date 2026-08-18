import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Full seminar detail - registration (including the optional coin price), and, once
// registered (or for the host), the supporting document download and the pre-recorded/
// ended-live audio + transcript. Reached from a Nearby Seminars card.
export default function SeminarDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [seminar, setSeminar] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    const fetchSeminar = async () => {
        try {
            const res = await api.get(`/seminars/${id}`);
            setSeminar(res.data);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load seminar.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchSeminar(); }, [id]);

    const handleRegister = async () => {
        setIsRegistering(true);
        try {
            const res = await api.post(`/seminars/${id}/register`);
            if (res.data?.rewardClaimed) {
                showToast(`You joined and earned +${res.data.rewardAmount} coins!`, 'success');
            } else {
                showToast('Registered!', 'success');
            }
            await fetchSeminar();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to register.', 'error');
        } finally {
            setIsRegistering(false);
        }
    };

    if (isLoading) {
        return (
            <div className="w-full h-[calc(100vh-64px)] flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-[32px] text-[#075e51]">sync</span>
            </div>
        );
    }

    if (!seminar) {
        return (
            <div className="w-full h-[calc(100vh-64px)] flex items-center justify-center">
                <p className="text-[14px] text-[#777682]">Seminar not found.</p>
            </div>
        );
    }

    const hasAccess = seminar.isHost || seminar.isRegistered;

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#F4F9F8] overflow-y-auto custom-scrollbar font-sans">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 md:p-8 pb-12">
                <button onClick={() => navigate('/app/courses/seminars')} className="text-[#777682] hover:text-[#075e51] flex items-center gap-1 text-[13px] font-bold mb-4 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Nearby Seminars
                </button>

                <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] overflow-hidden">
                    {seminar.imageUrl && (
                        <div className="h-40 sm:h-56 bg-[#181c22] bg-cover bg-center" style={{ backgroundImage: `url(${seminar.imageUrl})` }} />
                    )}
                    <div className="p-5 sm:p-8">
                        <div className="flex items-center justify-between mb-3">
                            <span className="bg-[#FEF9C3] text-[#854d0e] font-mono text-[10px] font-bold px-2 py-1 rounded uppercase">{seminar.category || 'Uncategorized'}</span>
                            <span className="text-[11px] font-mono font-semibold text-[#777682] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">{seminar.format === 'Live Broadcast' ? 'sensors' : seminar.format === 'In-Person' ? 'location_on' : 'videocam'}</span>
                                {seminar.format}
                            </span>
                        </div>
                        <h1 className="text-[22px] sm:text-[28px] font-bold text-[#181c22] mb-2">{seminar.title}</h1>
                        <p className="text-[13px] sm:text-[14px] text-[#464651] leading-relaxed mb-5">{seminar.abstract || 'No description provided.'}</p>

                        <div className="flex flex-wrap items-center gap-4 text-[12px] font-semibold text-[#777682] border-t border-b border-[#e0e2eb] py-4 mb-5">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">calendar_today</span> {seminar.date ? new Date(seminar.date).toLocaleDateString() : 'Date TBD'}</span>
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> {seminar.startTime} - {seminar.endTime}</span>
                            {seminar.hostName && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">person</span> {seminar.hostName}</span>}
                        </div>

                        {!seminar.isHost && (
                            <div className="mb-6">
                                {seminar.isRegistered ? (
                                    <div className="bg-[#FEF9C3] border border-[#EAB308]/50 text-[#854d0e] rounded-lg px-4 py-3 text-[13px] font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">check_circle</span> You're registered for this seminar.
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleRegister}
                                        disabled={isRegistering}
                                        className="bg-[#075e51] text-white px-6 py-3 rounded-lg text-[14px] font-bold shadow-sm hover:bg-[#097969] transition-colors disabled:opacity-60 flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{isRegistering ? 'hourglass_empty' : 'how_to_reg'}</span>
                                        {isRegistering ? 'Registering...' : seminar.registrationPriceCoins > 0 ? `Register · ${seminar.registrationPriceCoins} coins` : 'Register (Free)'}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="text-[14px] font-bold text-[#075e51] uppercase tracking-wide">Materials</h3>

                            {!hasAccess ? (
                                <p className="text-[13px] text-[#777682] italic bg-[#f1f3fc] rounded-lg px-4 py-3">Register to unlock the supporting document and audio/transcript for this seminar.</p>
                            ) : (
                                <>
                                    {seminar.documentUrl ? (
                                        <a href={seminar.documentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border border-[#e0e2eb] rounded-lg px-4 py-3 text-[13px] font-bold text-[#075e51] hover:bg-[#f1f3fc] transition-colors w-fit">
                                            <span className="material-symbols-outlined text-[18px]">description</span>
                                            {seminar.documentName || 'Download Document'}
                                        </a>
                                    ) : (
                                        <p className="text-[13px] text-[#c7c5d3] italic">No supporting document was attached.</p>
                                    )}

                                    {seminar.recordingId?.playbackUrl && (
                                        <div>
                                            <p className="text-[12px] font-bold text-[#464651] mb-2">Audio</p>
                                            <audio controls src={seminar.recordingId.playbackUrl} className="w-full" />
                                        </div>
                                    )}

                                    {seminar.transcriptText && (
                                        <div>
                                            <p className="text-[12px] font-bold text-[#464651] mb-2">Transcript</p>
                                            <div className="bg-[#f1f3fc] rounded-lg p-4 text-[13px] text-[#181c22] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                                                {seminar.transcriptText}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {toast.show && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-[13px] font-bold ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#075e51]'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
