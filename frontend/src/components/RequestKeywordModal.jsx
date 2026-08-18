import React, { useState } from 'react';
import api from '../services/api';

// Lets a user ask an admin to add a Main Topic / Sub Topic / Keyword that doesn't exist yet
// - reuses the existing Support ticket system (POST /support) rather than a new backend
// model, so the request shows up exactly where an admin already looks: the Support Inbox
// (Management > Support). Used from both the project-share keyword picker and the seminar
// category picker.
export default function RequestKeywordModal({ isOpen, onClose, contextLabel }) {
    const [mainTopic, setMainTopic] = useState('');
    const [subTopic, setSubTopic] = useState('');
    const [keywordText, setKeywordText] = useState('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isSent, setIsSent] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        setMainTopic(''); setSubTopic(''); setKeywordText(''); setNote('');
        setError(''); setIsSent(false);
        onClose();
    };

    const handleSubmit = async () => {
        if (!mainTopic.trim() || !keywordText.trim()) {
            setError('Main Topic and Keyword are required.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const lines = [
                `Keyword request${contextLabel ? ` (${contextLabel})` : ''}:`,
                `Main Topic: ${mainTopic.trim()}`,
                `Sub Topic: ${subTopic.trim() || '(none)'}`,
                `Keyword: ${keywordText.trim()}`
            ];
            if (note.trim()) lines.push(`Note: ${note.trim()}`);

            await api.post('/support', { text: lines.join('\n'), category: 'Keyword Request' });
            setIsSent(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#181c22]/50 flex items-center justify-center z-[110] backdrop-blur-sm px-4" onClick={handleClose}>
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-[#e0e2eb] flex items-center justify-between">
                    <h3 className="text-[16px] font-bold text-[#181c22]">Request a Topic/Keyword</h3>
                    <button type="button" onClick={handleClose} className="text-[#777682] hover:text-[#181c22]">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {isSent ? (
                    <div className="px-6 py-8 text-center">
                        <span className="material-symbols-outlined text-[#075e51] text-[36px] mb-2">check_circle</span>
                        <p className="text-[14px] font-bold text-[#181c22]">Request sent to the admin team.</p>
                        <p className="text-[12px] text-[#777682] mt-1">You'll be notified once it's added.</p>
                        <button onClick={handleClose} className="mt-4 bg-[#075e51] text-white px-5 py-2 rounded-lg text-[13px] font-bold hover:bg-[#097969] transition-colors">Done</button>
                    </div>
                ) : (
                    <>
                        <div className="px-6 py-5 space-y-3">
                            <p className="text-[13px] text-[#464651]">Can't find the right topic? Ask an admin to add it - this sends a request to Support.</p>
                            <div>
                                <label className="block text-[12px] font-bold text-[#181c22] mb-1.5">Main Topic</label>
                                <input type="text" value={mainTopic} onChange={(e) => setMainTopic(e.target.value)} placeholder="e.g. Technology" className="w-full bg-[#F4F9F8] border border-[#c7c5d3] rounded-md px-3 py-2 text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#075e51] focus:border-[#075e51] outline-none" />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#181c22] mb-1.5">Sub Topic <span className="font-normal text-[#777682]">(optional)</span></label>
                                <input type="text" value={subTopic} onChange={(e) => setSubTopic(e.target.value)} placeholder="e.g. Artificial Intelligence" className="w-full bg-[#F4F9F8] border border-[#c7c5d3] rounded-md px-3 py-2 text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#075e51] focus:border-[#075e51] outline-none" />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#181c22] mb-1.5">Keyword</label>
                                <input type="text" value={keywordText} onChange={(e) => setKeywordText(e.target.value)} placeholder="e.g. Machine Learning" className="w-full bg-[#F4F9F8] border border-[#c7c5d3] rounded-md px-3 py-2 text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#075e51] focus:border-[#075e51] outline-none" />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#181c22] mb-1.5">Note <span className="font-normal text-[#777682]">(optional)</span></label>
                                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else the admin should know" className="w-full bg-[#F4F9F8] border border-[#c7c5d3] rounded-md px-3 py-2 text-[14px] text-[#181c22] focus:ring-1 focus:ring-[#075e51] focus:border-[#075e51] outline-none min-h-[60px]" />
                            </div>
                            {error && <p className="text-[12px] text-[#ba1a1a] font-semibold">{error}</p>}
                        </div>
                        <div className="px-6 py-4 bg-[#F4F9F8] flex justify-end gap-3 border-t border-[#e0e2eb]">
                            <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg text-[13px] font-bold text-[#464651] hover:bg-[#e0e2eb] transition-colors">Cancel</button>
                            <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="bg-[#075e51] text-white px-5 py-2 rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#097969] transition-colors disabled:opacity-60">
                                {isSubmitting ? 'Sending...' : 'Send Request'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
