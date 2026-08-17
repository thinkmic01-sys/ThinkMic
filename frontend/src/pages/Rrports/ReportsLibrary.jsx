import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const TEMPLATE_LABELS = { academic: 'Standard Academic', executive: 'Executive Brief', standard: 'Data Dense' };

// completed/ready both mean "done" (workers write 'completed'; kept 'ready' too for forward-compat)
const STATUS_META = {
    completed: { label: 'Completed', className: 'bg-[#FEF9C3] text-[#854d0e] border-[#EAB308]/50', icon: 'check_circle', pulse: false },
    ready: { label: 'Completed', className: 'bg-[#FEF9C3] text-[#854d0e] border-[#EAB308]/50', icon: 'check_circle', pulse: false },
    generating: { label: 'Generating', className: 'bg-[#FEF9C3] text-[#B45309] border-[#EAB308]/50', icon: 'sync', pulse: true },
    pending: { label: 'Pending', className: 'bg-[#FEF9C3] text-[#B45309] border-[#EAB308]/50', icon: 'schedule', pulse: true },
    failed: { label: 'Failed', className: 'bg-[#ffdad6] text-[#ba1a1a] border-[#ffb4ab]', icon: 'error', pulse: false }
};

export default function ReportsLibrary() {
    const navigate = useNavigate();
    const accessToken = useSelector((state) => state.auth?.accessToken);

    const [reports, setReports] = useState([]);
    const [customAlert, setCustomAlert] = useState(null);

    useEffect(() => {
        if (!accessToken) return;
        const fetchReports = async () => {
            try {
                const res = await api.get('/reports');
                const data = res.data;
                if (data.reports) {
                    setReports(data.reports.map(r => ({
                        id: r._id,
                        title: r.title || 'Untitled Report',
                        date: r.createdAt,
                        status: r.status, // 'pending', 'generating', 'ready', 'failed', 'completed'
                        format: TEMPLATE_LABELS[r.template] || 'Standard'
                    })));
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchReports();
    }, [accessToken]);

    const [activeMenu, setActiveMenu] = useState(null);

    const handleRowClick = (reportId, status) => {
        if (status === 'failed') {
            setCustomAlert({
                title: 'Generation Failed',
                message: 'This report failed to generate. Please retry the generation process.'
            });
            return;
        }
        // Pending/generating reports open the same export page, which already shows a live
        // skeleton preview and updates itself in real time via Socket.IO once ready.
        navigate(`/app/reports/${reportId}`);
    };

    const handleEdit = (reportId) => {
        navigate(`/app/reports/${reportId}`);
    };

    const handleDelete = async (reportId) => {
        if (!window.confirm('Delete this report? This cannot be undone.')) return;
        try {
            await api.delete(`/reports/${reportId}`);
            setReports(prev => prev.filter(r => r.id !== reportId));
        } catch (error) {
            setCustomAlert({
                title: 'Delete Failed',
                message: 'Failed to delete the report. Please try again.'
            });
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="flex-1 w-full bg-[#F4F9F8] p-4 sm:p-6 md:p-8 flex justify-center h-[calc(100vh-64px)] overflow-y-auto font-sans">
            <div className="w-full flex flex-col pb-12">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 sm:mb-8 border-b border-[#e0e2eb] pb-4 sm:pb-6">
                    <div className="w-full sm:w-auto">
                        <h2 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-[#075e51] tracking-tight leading-tight">Reports Library</h2>
                        <p className="text-[13px] sm:text-[14px] md:text-[15px] text-[#464651] mt-1">Manage, preview, and export your generated research reports.</p>
                    </div>
                    <button
                        onClick={() => navigate('/app/projects')}
                        className="w-full sm:w-auto bg-[#075e51] text-white px-5 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold shadow-sm hover:bg-[#097969] transition-colors flex items-center justify-center gap-2 shrink-0"
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
                                        className="hover:bg-[#F4F9F8] transition-colors cursor-pointer group"
                                    >
                                        <td className="py-3 px-4 sm:py-4 sm:px-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${(report.status === 'ready' || report.status === 'completed') ? 'bg-[#FEF9C3] text-[#854d0e]' : 'bg-[#f1f3fc] text-[#777682]'}`}>
                                                    <span className="material-symbols-outlined text-[18px]">description</span>
                                                </div>
                                                <span className="font-bold text-[#181c22] text-[13px] sm:text-[14px] group-hover:text-[#075e51] transition-colors line-clamp-1">{report.title}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 sm:py-4 sm:px-6 font-mono text-[12px] sm:text-[13px] text-[#464651] whitespace-nowrap">
                                            {new Date(report.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="py-3 px-4 sm:py-4 sm:px-6 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-[12px] font-bold bg-[#f1f3fc] text-[#464651] border border-[#e0e2eb]">
                                                {report.format}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 sm:py-4 sm:px-6 whitespace-nowrap">
                                            {(() => {
                                                const meta = STATUS_META[report.status] || STATUS_META.pending;
                                                return (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border ${meta.className} ${meta.pulse ? 'animate-pulse' : ''}`}>
                                                        <span className={`material-symbols-outlined text-[12px] sm:text-[14px] ${meta.icon === 'sync' ? 'animate-spin' : ''}`}>{meta.icon}</span>
                                                        {meta.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="py-3 px-4 sm:py-4 sm:px-6 text-right relative">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === report.id ? null : report.id); }}
                                                className="text-[#c7c5d3] hover:text-[#075e51] transition-colors p-1 rounded hover:bg-[#f1f3fc]">
                                                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">more_vert</span>
                                            </button>
                                            {activeMenu === report.id && (
                                                <div className="absolute right-8 top-10 bg-white border border-[#e0e2eb] rounded-lg shadow-lg py-1 w-32 z-10 animate-in fade-in zoom-in duration-200">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(report.id); setActiveMenu(null); }}
                                                        className="w-full text-left px-4 py-2 text-[13px] text-[#464651] hover:bg-[#F4F9F8] hover:text-[#075e51] transition-colors flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                                        Edit
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(report.id); setActiveMenu(null); }}
                                                        className="w-full text-left px-4 py-2 text-[13px] text-[#ba1a1a] hover:bg-[#ffdad6]/30 transition-colors flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
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
                            className="bg-[#075e51] text-white px-6 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold shadow-sm hover:bg-[#097969] transition-colors"
                        >
                            Go to Projects
                        </button>
                    </div>
                )}
            </div>

            {/* Custom Alert Modal */}
            {customAlert && (
                <div className="fixed inset-0 bg-[#181c22]/50 flex items-center justify-center z-[100] backdrop-blur-sm px-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-[#e0e2eb] flex items-center gap-3">
                            <span className={`material-symbols-outlined text-[24px] ${customAlert.title === 'Generation Failed' ? 'text-[#ba1a1a]' : 'text-[#075e51]'}`}>
                                {customAlert.title === 'Generation Failed' ? 'error' : 'info'}
                            </span>
                            <h3 className="text-[16px] font-bold text-[#181c22]">{customAlert.title}</h3>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-[14px] text-[#464651] leading-relaxed">
                                {customAlert.message}
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-[#F4F9F8] flex justify-end">
                            <button
                                onClick={() => setCustomAlert(null)}
                                className="bg-[#075e51] text-white px-5 py-2 rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#097969] transition-colors"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}