import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';

export default function ReportExport() {
    const { id } = useParams();
    const accessToken = useSelector((state) => state.auth?.accessToken);

    // State to manage the live preview updates
    const [title, setTitle] = useState("Loading Report...");
    const [subtitle, setSubtitle] = useState("Prepared by ThinkMic AI");
    const [template, setTemplate] = useState("Standard Academic");
    const [sections, setSections] = useState({
        execSummary: true,
        findings: true,
        transcripts: false,
        sources: true,
    });
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [report, setReport] = useState(null);
    const userId = useSelector((state) => state.auth?.user?._id || state.auth?.user?.id);

    useEffect(() => {
        if (!accessToken || !id) return;
        const fetchReport = async () => {
            try {
                const res = await api.get(`/reports/${id}`);
                const data = res.data;
                if (data.report) {
                    setReport(data.report);
                    setTitle(data.report.title || "Untitled Document");
                    if (data.report.template) setTemplate(data.report.template);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchReport();
    }, [id, accessToken]);

    // Socket.IO for real-time report generation updates
    useEffect(() => {
        if (!userId) return;
        import('socket.io-client').then(({ io }) => {
            const socket = io('http://localhost:5000', { withCredentials: true });
            socket.on('connect', () => socket.emit('join', userId));
            socket.on('job_progress', (data) => {
                if (data.type === 'report' && data.reportId === id) {
                    setReport(prev => prev ? { ...prev, status: data.status } : prev);
                }
            });
            socket.on('report_complete', (data) => {
                if (data.reportId === id) {
                    setReport(prev => prev ? { ...prev, status: 'completed' } : prev);
                    // Fetch the updated report to get the content and URLs
                    api.get(`/reports/${id}`).then(res => {
                        if (res.data.report) setReport(res.data.report);
                    });
                }
            });
            return () => socket.disconnect();
        });
    }, [userId, id]);

    const toggleSection = (section) => {
        setSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const handleRegenerate = async () => {
        try {
            setReport(prev => ({ ...prev, status: 'generating' }));
            await api.put(`/reports/${id}/regenerate`, {
                title,
                template,
                sections
            });
        } catch (error) {
            console.error("Failed to regenerate report", error);
            // Revert state if error
            setReport(prev => ({ ...prev, status: 'completed' }));
        }
    };

    const handleDownload = async (type) => {
        try {
            const res = await api.get(`/reports/${id}/export`, {
                params: { type, title, subtitle }
            });
            if (res.data.url) {
                window.open(`http://localhost:5000${res.data.url}`, '_blank');
            }
        } catch (error) {
            console.error("Failed to download", error);
        }
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] overflow-y-auto bg-[#f9f9ff] font-sans">
            <div className="max-w-[1400px] mx-auto p-4 sm:p-6 md:p-8 flex flex-col min-h-full pb-20">

                {/* Header */}
                <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#e0e2eb] pb-4 md:pb-6">
                    <div className="w-full md:w-auto">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[#777682] text-[12px] sm:text-[13px] font-bold mb-2">
                            <Link to="/app/research" className="hover:text-[#222777] transition-colors cursor-pointer">Research</Link>
                            <span className="material-symbols-outlined text-[14px] sm:text-[16px]">chevron_right</span>
                            <Link to="/app/projects" className="hover:text-[#222777] transition-colors cursor-pointer">Projects</Link>
                            <span className="material-symbols-outlined text-[14px] sm:text-[16px]">chevron_right</span>
                            <span className="text-[#181c22]">Export Preview</span>
                        </div>
                        <h2 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-[#222777] tracking-tight">Report Export</h2>
                    </div>
                    <div className="flex items-center gap-2 text-[#777682] font-mono text-[11px] sm:text-[12px] font-bold bg-white border border-[#e0e2eb] px-3 py-1.5 rounded-md shadow-sm w-full md:w-auto justify-center md:justify-start mt-2 md:mt-0">
                        <span className="material-symbols-outlined text-[14px] sm:text-[16px]">history</span>
                        Generated 2 min ago
                    </div>
                </div>

                {/* Split Layout */}
                <div className="flex flex-col lg:flex-row gap-6 md:gap-8 flex-1 min-h-[600px]">

                    {/* LEFT PANEL: Live Preview (65%) */}
                    <div className="lg:w-[65%] flex flex-col bg-[#ebeef6] rounded-xl border border-[#c7c5d3] p-3 sm:p-4 relative overflow-hidden shadow-inner order-2 lg:order-1 h-[600px] lg:h-auto">

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 z-10 relative px-1 sm:px-2 gap-3">
                            <span className="text-[11px] sm:text-[12px] text-[#464651] font-bold uppercase tracking-wider hidden sm:block">Document Preview</span>
                            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                <span className="text-[11px] sm:text-[12px] text-[#464651] font-bold whitespace-nowrap">Template:</span>
                                <div className="relative w-full sm:w-auto">
                                    <select 
                                        value={template}
                                        onChange={(e) => setTemplate(e.target.value)}
                                        className="w-full sm:w-auto appearance-none bg-white border border-[#c7c5d3] rounded-md pl-3 pr-8 py-1.5 text-[12px] sm:text-[13px] font-bold text-[#181c22] focus:ring-1 focus:ring-[#222777] focus:border-[#222777] outline-none cursor-pointer shadow-sm"
                                    >
                                        <option>Standard Academic</option>
                                        <option>Executive Brief</option>
                                        <option>Data Dense</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-[#777682] pointer-events-none">expand_more</span>
                                </div>
                            </div>
                        </div>

                        {/* Report Canvas */}
                        <div className="flex-1 bg-white rounded-lg border border-[#c7c5d3] shadow-[0_4px_20px_rgba(58,63,143,0.08)] overflow-y-auto p-6 sm:p-8 md:p-14 relative custom-scrollbar">

                            {/* Cover */}
                            <div className="text-center py-8 sm:py-12 border-b border-[#e0e2eb] mb-8 sm:mb-10">
                                <h1 className="text-[24px] sm:text-[28px] md:text-[36px] font-bold text-[#181c22] mb-3 sm:mb-4 leading-tight tracking-tight">{title || "Untitled Document"}</h1>
                                <p className="text-[15px] md:text-[18px] text-[#464651] mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">A comprehensive study of enterprise integration patterns.</p>
                                <div className="font-mono text-[12px] sm:text-[14px] font-bold text-[#777682]">{subtitle || "Author Name"}</div>
                                <div className="font-mono text-[11px] sm:text-[12px] font-bold text-[#c7c5d3] mt-2 sm:mt-3">October 24, 2026</div>
                            </div>

                            {report && report.status === 'completed' && report.content ? (
                                <div className="mb-8 sm:mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="prose prose-sm sm:prose-base prose-slate max-w-none text-[#464651]">
                                        <div dangerouslySetInnerHTML={{ __html: report.content.replace(/\n/g, '<br/>') }} />
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-8 sm:mb-10 animate-pulse space-y-4">
                                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                    <div className="h-4 bg-gray-200 rounded w-4/6 mt-6"></div>
                                </div>
                            )}

                            {sections.transcripts && (
                                <div className="mb-8 sm:mb-10 opacity-70 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-[#f9f9ff] p-4 sm:p-6 rounded-lg border border-[#e0e2eb] border-dashed">
                                    <h3 className="text-[16px] sm:text-[20px] font-bold text-[#777682] mb-2">Full Transcripts</h3>
                                    <p className="text-[12px] sm:text-[13px] text-[#777682] font-mono">[Transcript data hidden for brevity in preview mode. Will be appended to final export.]</p>
                                </div>
                            )}

                            {sections.sources && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h3 className="text-[18px] sm:text-[22px] font-bold text-[#222777] border-b-2 border-[#e0e2eb] pb-2 mb-3 sm:mb-4">Sources & Citations</h3>
                                    <div className="space-y-3 sm:space-y-4">
                                        <div className="flex items-start gap-2 sm:gap-3 text-[13px] sm:text-[14px] text-[#464651]">
                                            <span className="material-symbols-outlined text-[#c7c5d3] text-[18px] sm:text-[20px] mt-0.5">mic</span>
                                            <span className="leading-relaxed">Interview: VP Engineering, TechCorp (Oct 12) - <em className="text-[#181c22]">"Security is paramount."</em></span>
                                        </div>
                                        <div className="flex items-start gap-2 sm:gap-3 text-[13px] sm:text-[14px] text-[#464651]">
                                            <span className="material-symbols-outlined text-[#c7c5d3] text-[18px] sm:text-[20px] mt-0.5">description</span>
                                            <span className="leading-relaxed">Internal Survey Data Q3-Q4 2026</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: Controls (35%) */}
                    <div className="lg:w-[35%] flex flex-col gap-6 order-1 lg:order-2">

                        {/* Meta Setup */}
                        <div className="bg-white rounded-xl border border-[#e0e2eb] shadow-[0_1px_4px_rgba(58,63,143,0.05)] p-5 sm:p-6">
                            <h3 className="text-[11px] sm:text-[12px] font-bold text-[#777682] uppercase tracking-wider mb-4 sm:mb-5">Report Configuration</h3>
                            <div className="mb-4 sm:mb-5">
                                <label className="block text-[12px] sm:text-[13px] font-bold text-[#181c22] mb-1.5 sm:mb-2">Report Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-[#f9f9ff] border border-[#c7c5d3] rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-[13px] sm:text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#222777] focus:border-[#222777] outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] sm:text-[13px] font-bold text-[#181c22] mb-1.5 sm:mb-2">Author / Subtitle</label>
                                <input
                                    type="text"
                                    value={subtitle}
                                    onChange={(e) => setSubtitle(e.target.value)}
                                    className="w-full bg-[#f9f9ff] border border-[#c7c5d3] rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-[13px] sm:text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#222777] focus:border-[#222777] outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Sections Toggle */}
                        <div className="bg-white rounded-xl border border-[#e0e2eb] shadow-[0_1px_4px_rgba(58,63,143,0.05)] p-5 sm:p-6">
                            <h3 className="text-[11px] sm:text-[12px] font-bold text-[#777682] uppercase tracking-wider mb-4 sm:mb-5">Include Sections</h3>
                            <div className="space-y-4 sm:space-y-5">
                                {[
                                    { id: 'execSummary', label: 'Executive Summary', icon: 'summarize' },
                                    { id: 'findings', label: 'Research Findings', icon: 'science' },
                                    { id: 'transcripts', label: 'Full Transcripts', icon: 'record_voice_over' },
                                    { id: 'sources', label: 'Sources', icon: 'link' },
                                ].map((item) => (
                                    <div key={item.id} className={`flex justify-between items-center transition-opacity duration-200 ${!sections[item.id] ? 'opacity-60' : 'opacity-100'}`}>
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <span className={`material-symbols-outlined text-[18px] sm:text-[20px] ${sections[item.id] ? 'text-[#222777]' : 'text-[#c7c5d3]'}`}>
                                                {item.icon}
                                            </span>
                                            <span className="text-[13px] sm:text-[14px] text-[#181c22] font-semibold">{item.label}</span>
                                        </div>
                                        {/* Custom CSS Toggle */}
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={sections[item.id]}
                                                onChange={() => toggleSection(item.id)}
                                            />
                                            <div className="w-9 h-5 sm:w-10 sm:h-5 bg-[#e0e2eb] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#222777]"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleRegenerate}
                                disabled={report?.status !== 'completed'}
                                className={`mt-6 w-full text-white text-[13px] sm:text-[14px] font-bold py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors ${report?.status === 'completed' ? 'bg-[#00c2cb] hover:bg-[#00a8b0]' : 'bg-[#e0e2eb] text-[#c7c5d3] cursor-wait'}`}
                            >
                                <span className={`material-symbols-outlined text-[18px] sm:text-[20px] ${report?.status !== 'completed' ? 'animate-spin' : ''}`}>
                                    {report?.status === 'completed' ? 'refresh' : 'sync'}
                                </span>
                                {report?.status === 'completed' ? 'Apply & Regenerate' : 'Generating...'}
                            </button>
                        </div>

                        {/* Export Actions */}
                        <div className="mt-auto flex flex-col gap-3 pb-6 lg:pb-0">
                            <button 
                                onClick={() => handleDownload('pdf')}
                                disabled={!report?.pdfLocalPath}
                                className={`w-full text-white text-[13px] sm:text-[14px] font-bold py-2.5 sm:py-3 px-6 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors
                                    ${report?.pdfLocalPath ? 'bg-[#222777] hover:bg-[#3a3f8f]' : 'bg-gray-400 cursor-not-allowed'}`}>
                                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">picture_as_pdf</span>
                                Download PDF
                            </button>
                            <button 
                                onClick={() => handleDownload('docx')}
                                disabled={!report?.docxLocalPath}
                                className={`w-full border text-[13px] sm:text-[14px] font-bold py-2.5 sm:py-3 px-6 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors
                                    ${report?.docxLocalPath ? 'bg-white border-[#222777] text-[#222777] hover:bg-[#f1f3fc]' : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'}`}>
                                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">description</span>
                                Download Word
                            </button>
                            <button
                                onClick={() => setIsEmailModalOpen(true)}
                                className="w-full bg-transparent text-[#464651] text-[13px] sm:text-[14px] font-bold py-2.5 sm:py-3 px-6 rounded-lg hover:bg-[#e0e2eb] hover:text-[#181c22] transition-colors flex items-center justify-center gap-2 border border-transparent"
                            >
                                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">send</span>
                                Send via Email
                            </button>
                        </div>
                    </div>
                </div>

                {/* Email Modal */}
                {isEmailModalOpen && (
                    <div className="fixed inset-0 bg-[#181c22]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-[#e0e2eb] flex justify-between items-center bg-[#f9f9ff]">
                                <h3 className="text-[16px] sm:text-[18px] font-bold text-[#181c22]">Email Report</h3>
                                <button className="text-[#777682] hover:text-[#ba1a1a] transition-colors flex items-center justify-center w-8 h-8 rounded-full hover:bg-white border border-transparent hover:border-[#e0e2eb]" onClick={() => setIsEmailModalOpen(false)}>
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                            <div className="p-5 sm:p-6 flex flex-col gap-4 sm:gap-5">
                                <div>
                                    <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] uppercase tracking-wider mb-1.5 sm:mb-2">To:</label>
                                    <input type="email" placeholder="colleague@company.com" className="w-full bg-[#f9f9ff] border border-[#c7c5d3] rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-[13px] sm:text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#222777] focus:border-[#222777] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] uppercase tracking-wider mb-1.5 sm:mb-2">Message (Optional):</label>
                                    <textarea rows="3" placeholder="Here is the latest AI adoption report..." className="w-full bg-[#f9f9ff] border border-[#c7c5d3] rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-[13px] sm:text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#222777] focus:border-[#222777] outline-none resize-none"></textarea>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4 bg-[#f1f3fc] p-3 sm:p-4 rounded-lg border border-[#e0e2eb]">
                                    <span className="material-symbols-outlined text-[#222777] text-[24px] sm:text-[28px]">picture_as_pdf</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[12px] sm:text-[13px] font-bold text-[#181c22] truncate">Market_Analysis_Q4.pdf</div>
                                        <div className="font-mono text-[10px] sm:text-[11px] font-bold text-[#777682] mt-0.5">2.4 MB</div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 sm:px-6 py-3 sm:py-4 border-t border-[#e0e2eb] bg-[#f9f9ff] flex justify-end gap-2 sm:gap-3">
                                <button className="px-4 sm:px-5 py-2 text-[#464651] text-[12px] sm:text-[13px] font-bold hover:bg-[#e0e2eb] rounded-lg transition-colors border border-transparent" onClick={() => setIsEmailModalOpen(false)}>
                                    Cancel
                                </button>
                                <button 
                                    onClick={async () => {
                                        // Mock email send
                                        alert("Email sent successfully!");
                                        setIsEmailModalOpen(false);
                                    }}
                                    className="px-4 sm:px-6 py-2 bg-[#222777] text-white text-[12px] sm:text-[13px] font-bold rounded-lg shadow-sm hover:bg-[#3a3f8f] transition-colors flex items-center gap-1 sm:gap-2"
                                >
                                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">send</span> Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>
        </div>
    );
}