// frontend/src/pages/ReportExport.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ReportExport() {
    // State to manage the live preview updates
    const [title, setTitle] = useState("Market Analysis: Q4 AI Adoption Trends");
    const [subtitle, setSubtitle] = useState("Prepared by ThinkMic AI");
    const [sections, setSections] = useState({
        execSummary: true,
        findings: true,
        transcripts: false,
        sources: true,
    });
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    const toggleSection = (section) => {
        setSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] overflow-y-auto bg-[#f9f9ff]">
            <div className="max-w-[1400px] mx-auto p-6 md:p-8 flex flex-col h-full min-h-screen pb-20">

                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#e0e2eb] pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-[#777682] text-[13px] font-bold mb-2">
                            <Link to="/app/research" className="hover:text-[#222777] transition-colors cursor-pointer">Research</Link>
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            <Link to="/app/projects" className="hover:text-[#222777] transition-colors cursor-pointer">Projects</Link>
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            <span className="text-[#181c22]">Export Preview</span>
                        </div>
                        <h2 className="text-[32px] font-bold text-[#222777] tracking-tight">Report Export</h2>
                    </div>
                    <div className="flex items-center gap-2 text-[#777682] font-mono text-[12px] font-bold bg-white border border-[#e0e2eb] px-3 py-1.5 rounded-md shadow-sm">
                        <span className="material-symbols-outlined text-[16px]">history</span>
                        Generated 2 min ago
                    </div>
                </div>

                {/* Split Layout */}
                <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-[600px]">

                    {/* LEFT PANEL: Live Preview (65%) */}
                    <div className="lg:w-[65%] flex flex-col bg-[#ebeef6] rounded-xl border border-[#c7c5d3] p-4 relative overflow-hidden shadow-inner">
                        <div className="flex justify-between items-center mb-4 z-10 relative px-2">
                            <span className="text-[12px] text-[#464651] font-bold uppercase tracking-wider">Document Preview</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[12px] text-[#464651] font-bold">Template:</span>
                                <div className="relative">
                                    <select className="appearance-none bg-white border border-[#c7c5d3] rounded-md pl-3 pr-8 py-1.5 text-[13px] font-bold text-[#181c22] focus:ring-1 focus:ring-[#222777] focus:border-[#222777] outline-none cursor-pointer shadow-sm">
                                        <option>Standard Academic</option>
                                        <option>Executive Brief</option>
                                        <option>Data Dense</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-[#777682] pointer-events-none">expand_more</span>
                                </div>
                            </div>
                        </div>

                        {/* Report Canvas */}
                        <div className="flex-1 bg-white rounded-lg border border-[#c7c5d3] shadow-[0_4px_20px_rgba(58,63,143,0.08)] overflow-y-auto p-10 md:p-14 relative custom-scrollbar">

                            {/* Cover */}
                            <div className="text-center py-12 border-b border-[#e0e2eb] mb-10">
                                <h1 className="text-[36px] font-bold text-[#181c22] mb-4 leading-tight tracking-tight">{title || "Untitled Document"}</h1>
                                <p className="text-[18px] text-[#464651] mb-8 max-w-2xl mx-auto leading-relaxed">A comprehensive study of enterprise integration patterns.</p>
                                <div className="font-mono text-[14px] font-bold text-[#777682]">{subtitle || "Author Name"}</div>
                                <div className="font-mono text-[12px] font-bold text-[#c7c5d3] mt-3">October 24, 2026</div>
                            </div>

                            {/* Conditional Sections based on State */}
                            {sections.execSummary && (
                                <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h3 className="text-[22px] font-bold text-[#222777] border-b-2 border-[#e0e2eb] pb-2 mb-4">Executive Summary</h3>
                                    <p className="text-[15px] text-[#464651] leading-[1.8] mb-5">This report synthesizes findings from 45 enterprise interviews regarding their Q4 AI adoption strategies. The data reveals a significant shift from exploratory pilot programs to operational integration, particularly in customer service and internal knowledge management workflows.</p>
                                    <div className="bg-[#e6fbfc] rounded-lg p-5 border-l-[4px] border-[#00c2cb]">
                                        <span className="text-[11px] text-[#006e73] font-bold uppercase tracking-wider block mb-2">Key Insight</span>
                                        <p className="text-[14px] text-[#181c22] italic leading-relaxed">"Enterprises are prioritizing data privacy and security compliance over raw capability in their latest vendor selection cycles."</p>
                                    </div>
                                </div>
                            )}

                            {sections.findings && (
                                <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h3 className="text-[22px] font-bold text-[#222777] border-b-2 border-[#e0e2eb] pb-2 mb-4">Research Findings</h3>
                                    <p className="text-[15px] text-[#464651] leading-[1.8] mb-4">Analysis of the transcribed data indicates three primary vectors of adoption:</p>
                                    <ul className="list-disc pl-6 text-[15px] text-[#464651] space-y-3 mb-4 marker:text-[#00c2cb]">
                                        <li><strong className="text-[#181c22]">Workflow Automation:</strong> 68% of respondents cite this as their immediate ROI driver.</li>
                                        <li><strong className="text-[#181c22]">Predictive Analytics:</strong> A growing interest (up 22% quarter-over-quarter) in leveraging historical data.</li>
                                        <li><strong className="text-[#181c22]">Creative Augmentation:</strong> Slower adoption, primarily localized to marketing departments.</li>
                                    </ul>
                                </div>
                            )}

                            {sections.transcripts && (
                                <div className="mb-10 opacity-70 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-[#f9f9ff] p-6 rounded-lg border border-[#e0e2eb] border-dashed">
                                    <h3 className="text-[20px] font-bold text-[#777682] mb-2">Full Transcripts</h3>
                                    <p className="text-[13px] text-[#777682] font-mono">[Transcript data hidden for brevity in preview mode. Will be appended to final export.]</p>
                                </div>
                            )}

                            {sections.sources && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h3 className="text-[22px] font-bold text-[#222777] border-b-2 border-[#e0e2eb] pb-2 mb-4">Sources & Citations</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3 text-[14px] text-[#464651]">
                                            <span className="material-symbols-outlined text-[#c7c5d3] text-[20px] mt-0.5">mic</span>
                                            <span className="leading-relaxed">Interview: VP Engineering, TechCorp (Oct 12) - <em className="text-[#181c22]">"Security is paramount."</em></span>
                                        </div>
                                        <div className="flex items-start gap-3 text-[14px] text-[#464651]">
                                            <span className="material-symbols-outlined text-[#c7c5d3] text-[20px] mt-0.5">description</span>
                                            <span className="leading-relaxed">Internal Survey Data Q3-Q4 2026</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: Controls (35%) */}
                    <div className="lg:w-[35%] flex flex-col gap-6">

                        {/* Meta Setup */}
                        <div className="bg-white rounded-xl border border-[#e0e2eb] shadow-[0_1px_4px_rgba(58,63,143,0.05)] p-6">
                            <h3 className="text-[12px] font-bold text-[#777682] uppercase tracking-wider mb-5">Report Configuration</h3>
                            <div className="mb-5">
                                <label className="block text-[13px] font-bold text-[#181c22] mb-2">Report Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-[#f9f9ff] border border-[#c7c5d3] rounded-md px-4 py-2.5 text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#222777] focus:border-[#222777] outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-[#181c22] mb-2">Author / Subtitle</label>
                                <input
                                    type="text"
                                    value={subtitle}
                                    onChange={(e) => setSubtitle(e.target.value)}
                                    className="w-full bg-[#f9f9ff] border border-[#c7c5d3] rounded-md px-4 py-2.5 text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#222777] focus:border-[#222777] outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Sections Toggle */}
                        <div className="bg-white rounded-xl border border-[#e0e2eb] shadow-[0_1px_4px_rgba(58,63,143,0.05)] p-6">
                            <h3 className="text-[12px] font-bold text-[#777682] uppercase tracking-wider mb-5">Include Sections</h3>
                            <div className="space-y-5">
                                {[
                                    { id: 'execSummary', label: 'Executive Summary', icon: 'summarize' },
                                    { id: 'findings', label: 'Research Findings', icon: 'science' },
                                    { id: 'transcripts', label: 'Full Transcripts', icon: 'record_voice_over' },
                                    { id: 'sources', label: 'Sources', icon: 'link' },
                                ].map((item) => (
                                    <div key={item.id} className={`flex justify-between items-center transition-opacity duration-200 ${!sections[item.id] ? 'opacity-60' : 'opacity-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined text-[20px] ${sections[item.id] ? 'text-[#222777]' : 'text-[#c7c5d3]'}`}>
                                                {item.icon}
                                            </span>
                                            <span className="text-[14px] text-[#181c22] font-semibold">{item.label}</span>
                                        </div>
                                        {/* Custom CSS Toggle */}
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={sections[item.id]}
                                                onChange={() => toggleSection(item.id)}
                                            />
                                            <div className="w-10 h-5 bg-[#e0e2eb] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#222777]"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Export Actions */}
                        <div className="mt-auto flex flex-col gap-3">
                            <button className="w-full bg-[#222777] text-white text-[14px] font-bold py-3 px-6 rounded-lg shadow-sm hover:bg-[#3a3f8f] transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                                Download PDF
                            </button>
                            <button className="w-full bg-white border border-[#222777] text-[#222777] text-[14px] font-bold py-3 px-6 rounded-lg hover:bg-[#f1f3fc] transition-colors flex items-center justify-center gap-2 shadow-sm">
                                <span className="material-symbols-outlined text-[20px]">description</span>
                                Download Word
                            </button>
                            <button
                                onClick={() => setIsEmailModalOpen(true)}
                                className="w-full bg-transparent text-[#464651] text-[14px] font-bold py-3 px-6 rounded-lg hover:bg-[#e0e2eb] hover:text-[#181c22] transition-colors flex items-center justify-center gap-2 border border-transparent"
                            >
                                <span className="material-symbols-outlined text-[20px]">send</span>
                                Send via Email
                            </button>
                        </div>
                    </div>
                </div>

                {/* Email Modal */}
                {isEmailModalOpen && (
                    <div className="fixed inset-0 bg-[#181c22]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-5 border-b border-[#e0e2eb] flex justify-between items-center bg-[#f9f9ff]">
                                <h3 className="text-[18px] font-bold text-[#181c22]">Email Report</h3>
                                <button className="text-[#777682] hover:text-[#ba1a1a] transition-colors flex items-center justify-center w-8 h-8 rounded-full hover:bg-white" onClick={() => setIsEmailModalOpen(false)}>
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-6 flex flex-col gap-5">
                                <div>
                                    <label className="block text-[12px] font-bold text-[#464651] uppercase tracking-wider mb-2">To:</label>
                                    <input type="email" placeholder="colleague@company.com" className="w-full bg-[#f9f9ff] border border-[#c7c5d3] rounded-md px-4 py-2.5 text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#222777] focus:border-[#222777] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-[#464651] uppercase tracking-wider mb-2">Message (Optional):</label>
                                    <textarea rows="3" placeholder="Here is the latest AI adoption report..." className="w-full bg-[#f9f9ff] border border-[#c7c5d3] rounded-md px-4 py-2.5 text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#222777] focus:border-[#222777] outline-none resize-none"></textarea>
                                </div>
                                <div className="flex items-center gap-4 bg-[#f1f3fc] p-4 rounded-lg border border-[#e0e2eb]">
                                    <span className="material-symbols-outlined text-[#222777] text-[28px]">picture_as_pdf</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-bold text-[#181c22] truncate">Market_Analysis_Q4.pdf</div>
                                        <div className="font-mono text-[11px] font-bold text-[#777682] mt-0.5">2.4 MB</div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-[#e0e2eb] bg-[#f9f9ff] flex justify-end gap-3">
                                <button className="px-5 py-2 text-[#464651] text-[13px] font-bold hover:bg-[#e0e2eb] rounded-lg transition-colors border border-transparent" onClick={() => setIsEmailModalOpen(false)}>
                                    Cancel
                                </button>
                                <button className="px-6 py-2 bg-[#222777] text-white text-[13px] font-bold rounded-lg shadow-sm hover:bg-[#3a3f8f] transition-colors flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">send</span> Send
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