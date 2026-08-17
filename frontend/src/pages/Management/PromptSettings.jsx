import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const FIELDS = [
    {
        key: 'summaryPrompt',
        label: 'Summary Generation',
        description: 'What the AI focuses on when writing a transcript summary.'
    },
    {
        key: 'queryExtractionPrompt',
        label: 'Research Query Extraction',
        description: 'What kind of follow-up search queries the AI should suggest from a transcript.'
    },
    {
        key: 'reportPrompt',
        label: 'Report Generation',
        description: 'The AI\'s persona and mission when synthesizing a report from a transcript, summary, and research.'
    }
];

// Only the persona/instructional sentence for each step is editable here - the technical
// scaffolding each step depends on to actually function (JSON schema for summaries, HTML
// output contract for reports, language handling) is intentionally not exposed, so an admin
// can't accidentally break parsing or rendering by editing a prompt.
export default function PromptSettings() {
    const [values, setValues] = useState({});
    const [defaults, setDefaults] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const res = await api.get('/admin/prompts/settings');
                setValues({
                    summaryPrompt: res.data.settings.summaryPrompt,
                    queryExtractionPrompt: res.data.settings.queryExtractionPrompt,
                    reportPrompt: res.data.settings.reportPrompt
                });
                setDefaults(res.data.defaults || {});
            } catch (err) {
                showToast('Failed to load prompt settings.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (key, value) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    const handleResetToDefault = (key) => {
        if (defaults[key] !== undefined) {
            handleChange(key, defaults[key]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await api.patch('/admin/prompts/settings', values);
            setValues({
                summaryPrompt: res.data.settings.summaryPrompt,
                queryExtractionPrompt: res.data.settings.queryExtractionPrompt,
                reportPrompt: res.data.settings.reportPrompt
            });
            showToast('AI prompts saved.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to save prompt settings.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full p-4 sm:p-6 md:p-8 flex flex-col pb-20 min-h-full">
            <div className="mb-5 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#075e51] mb-1 tracking-tight">AI Prompts</h2>
                <p className="text-[#777682] text-sm sm:text-base max-w-2xl">
                    Control what the AI is instructed to focus on when generating a summary, extracting research queries, and writing a report. Changes apply to every future generation immediately.
                </p>
            </div>

            {isLoading ? (
                <p className="text-center text-[#777682] py-12 text-sm">Loading prompt settings...</p>
            ) : (
                <div className="space-y-5 sm:space-y-6">
                    {FIELDS.map((field) => (
                        <div key={field.key} className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 sm:p-6">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                    <h3 className="text-[15px] font-bold text-[#181c22]">{field.label}</h3>
                                    <p className="text-[13px] text-[#777682] mt-0.5">{field.description}</p>
                                </div>
                                <button
                                    onClick={() => handleResetToDefault(field.key)}
                                    className="shrink-0 text-[12px] font-bold text-[#777682] hover:text-[#075e51] transition-colors flex items-center gap-1"
                                    title="Reset to default"
                                >
                                    <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                                    Reset
                                </button>
                            </div>
                            <textarea
                                value={values[field.key] || ''}
                                onChange={(e) => handleChange(field.key, e.target.value)}
                                rows={4}
                                className="w-full border border-[#c7c5d3] rounded-md py-2.5 px-3 text-[13px] leading-relaxed outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51] resize-y"
                            />
                        </div>
                    ))}

                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-[#075e51] text-white text-[13px] font-bold px-6 py-2.5 rounded-md hover:bg-[#097969] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}

            {toast.show && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-[13px] font-bold ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#075e51]'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
