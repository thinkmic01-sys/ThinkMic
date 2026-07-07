import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ReportsLibrary() {
    const navigate = useNavigate();

    // MOCK DATA: Matches the 'reports' DB schema from the System Design
    const [reports, setReports] = useState([
        { id: 'rpt_101', title: 'Market Analysis: Q4 AI Adoption Trends', date: '2026-10-24', status: 'ready', format: 'Standard Academic' },
        { id: 'rpt_102', title: 'Transformer Architecture Memory Retention', date: '2026-10-22', status: 'ready', format: 'Executive Brief' },
        { id: 'rpt_103', title: 'Quantum Encryption Implications', date: '2026-10-25', status: 'generating', format: 'Data Dense' },
        { id: 'rpt_104', title: 'Failed Extraction Log', date: '2026-10-20', status: 'failed', format: 'Standard Academic' },
    ]);

    const handleRowClick = (reportId, status) => {
        if (status === 'ready') {
            navigate(`/app/reports/${reportId}`);
        } else if (status === 'failed') {
            alert("This report failed to generate. Please retry the generation process.");
        } else {
            alert("This report is currently generating. Please wait.");
        }
    };

    return (
        <div className="flex-1 w-full bg-[#f9f9ff] p-4 sm:p-6 md:p-8 flex justify-center h-[calc(100vh-64px)] overflow-y-auto font-sans">
            <div className="w-full max-w-[1280px] flex flex-col pb-12">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 sm:mb-8 border-b border-[#e0e2eb] pb-4 sm:pb-6">
                    <div className="w-full sm:w-auto">
                        <h2 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-[#222777] tracking-tight leading-tight">Reports Library</h2>
                        <p className="text-[13px] sm:text-[14px] md:text-[15px] text-[#464651] mt-1">Manage, preview, and export your generated research reports.</p>
                    </div>
                    <button
                        onClick={() => navigate('/app/projects')}
                        className="w-full sm:w-auto bg-[#222777] text-white px-5 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold shadow-sm hover:bg-[#3a3f8f] transition-colors flex items-center justify-center gap-2 shrink-0"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span> New Report
                    </button>
                </div>

                {/* Reports Table */}
                {reports.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] overflow-hidden">
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead className="bg-[#f1f3fc] border-b border-[#e0e2eb]">
                                <tr>
                                    <th className="py-3 px-4 sm:py-4 sm:px-6 text-[11px] sm:text-[12px] text-[#777682] font-bold uppercase tracking-wider whitespace-nowrap">Report Title</th>
                                    <th className="py-3 px-4 sm:py-4 sm:px-6 text-[11px] sm:text-[12px] text-[#777682] font-bold uppercase tracking-wider whitespace-nowrap">Date Created</th>
                                    <th className="py-3 px-4 sm:py-4 sm:px-6 text-[11px] sm:text-[12px] text-[#777682] font-bold uppercase tracking-wider whitespace-nowrap">Format</th>
                                    <th className="py-3 px-4 sm:py-4 sm:px-6 text-[11px] sm:text-[12px] text-[#777682] font-bold uppercase tracking-wider whitespace-nowrap">Status</th>
                                    <th className="py-3 px-4 sm:py-4 sm:px-6 text-right text-[11px] sm:text-[12px] text-[#777682] font-bold uppercase tracking-wider whitespace-nowrap">Actions</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e0e2eb]">
                                {reports.map((report) => (
                                    <tr
                                        key={report.id}
                                        onClick={() => handleRowClick(report.id, report.status)}
                                        className="hover:bg-[#f9f9ff] transition-colors cursor-pointer group"
                                    >
                                        <td className="py-3 px-4 sm:py-4 sm:px-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${report.status === 'ready' ? 'bg-[#e6fbfc] text-[#006e73]' : 'bg-[#f1f3fc] text-[#777682]'}`}>
                                                    <span className="material-symbols-outlined text-[18px]">description</span>
                                                </div>
                                                <span className="font-bold text-[#181c22] text-[13px] sm:text-[14px] group-hover:text-[#222777] transition-colors line-clamp-1">{report.title}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 sm:py-4 sm:px-6 font-mono text-[12px] sm:text-[13px] text-[#464651] whitespace-nowrap">
                                            {new Date(report.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="py-3 px-4 sm:py-4 sm:px-6 text-[12px] sm:text-[13px] font-semibold text-[#464651] whitespace-nowrap">
                                            {report.format}
                                        </td>
                                        <td className="py-3 px-4 sm:py-4 sm:px-6 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border
                                                ${report.status === 'ready' ? 'bg-[#e6fbfc] text-[#006e73] border-[#6bf6ff]/50' : ''}
                                                ${report.status === 'generating' ? 'bg-[#fff8e1] text-[#b45309] border-[#ffe082]' : ''}
                                                ${report.status === 'failed' ? 'bg-[#ffdad6] text-[#ba1a1a] border-[#ffb4ab]' : ''}
                                            `}>
                                                {report.status === 'generating' && <span className="material-symbols-outlined text-[12px] sm:text-[14px] animate-spin">sync</span>}
                                                {report.status === 'ready' && <span className="material-symbols-outlined text-[12px] sm:text-[14px]">check_circle</span>}
                                                {report.status === 'failed' && <span className="material-symbols-outlined text-[12px] sm:text-[14px]">error</span>}
                                                {report.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 sm:py-4 sm:px-6 text-right">
                                            <button className="text-[#c7c5d3] hover:text-[#222777] transition-colors p-1 rounded hover:bg-[#f1f3fc]">
                                                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">more_vert</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Zero-Data Empty State */
                    <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-[#e0e2eb] border-dashed py-16 sm:py-24 px-4 shadow-sm mx-4 sm:mx-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#f1f3fc] rounded-full flex items-center justify-center text-[#c7c5d3] mb-3 sm:mb-4">
                            <span className="material-symbols-outlined text-[28px] sm:text-[32px]">folder_open</span>
                        </div>
                        <h3 className="text-[16px] sm:text-[18px] font-bold text-[#181c22] mb-2 text-center">No reports generated yet</h3>
                        <p className="text-[13px] sm:text-[14px] text-[#777682] mb-5 sm:mb-6 text-center max-w-md leading-relaxed">
                            You haven't synthesized any research into a final report. Head over to your Projects to compile your first document.
                        </p>
                        <button
                            onClick={() => navigate('/app/projects')}
                            className="bg-[#222777] text-white px-6 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold shadow-sm hover:bg-[#3a3f8f] transition-colors"
                        >
                            Go to Projects
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}