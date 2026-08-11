import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import ProjectNotes from './ProjectNotes';

export default function ProjectDashboard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = useSelector(state => state.auth?.accessToken);
    
    const [project, setProject] = useState(null);
    const [recordings, setRecordings] = useState([]);
    const [reports, setReports] = useState([]);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'data', 'reports'
    
    const [notesHtml, setNotesHtml] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    useEffect(() => {
        if (!token) return;
        const fetchProject = async () => {
            try {
                const res = await api.get(`/projects/${id}`);
                setProject(res.data.project);
                setNotesHtml(res.data.project.notesHtml || '');
                setRecordings(res.data.recordings || []);
                setReports(res.data.reports || []);
            } catch (err) {
                console.error("Failed to fetch project", err);
            }
        };
        fetchProject();
    }, [token, id]);

    const handleSaveNotes = async () => {
        setIsSavingNotes(true);
        try {
            await api.put(`/projects/${id}`, { ...project, notesHtml });
            // Show toast or success indicator (simulated here)
            setTimeout(() => setIsSavingNotes(false), 500);
        } catch (err) {
            console.error("Failed to save notes", err);
            setIsSavingNotes(false);
        }
    };

    if (!project) return (
        <div className="flex-1 w-full h-[calc(100vh-64px)] flex items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-[32px] text-[#222777]">sync</span>
        </div>
    );

    return (
        <div className="flex-1 w-full bg-[#f9f9ff] h-[calc(100vh-64px)] overflow-y-auto font-sans flex flex-col">
            {/* Header Area */}
            <div className="bg-white border-b border-[#e0e2eb] px-4 sm:px-6 md:px-8 pt-6 pb-0 shadow-sm z-10 sticky top-0">
                <div className="w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-2 text-[12px] font-bold text-[#777682] uppercase tracking-widest mb-2 cursor-pointer hover:text-[#222777]" onClick={() => navigate('/app/projects')}>
                                <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                                Back to Hub
                            </div>
                            <h2 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-[#181c22] tracking-tight">{project.name}</h2>
                            {project.description && (
                                <p className="text-[14px] sm:text-[15px] text-[#464651] mt-1">{project.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => navigate(`/app/research?projectId=${id}`)}
                            className="w-full sm:w-auto bg-[#00c2cb] text-white px-6 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold shadow-sm hover:bg-[#00a8b0] transition-colors flex items-center justify-center gap-2 shrink-0"
                        >
                            <span className="material-symbols-outlined text-[18px]">mic</span> Start New Session
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
                        {['overview', 'data', 'reports'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-3 text-[13px] sm:text-[14px] font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-[#222777] text-[#222777]' : 'border-transparent text-[#777682] hover:text-[#181c22]'}`}
                            >
                                {tab === 'data' ? 'Raw Data & Recordings' : tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="w-full p-4 sm:p-6 md:p-8 flex-1 flex flex-col">
                {activeTab === 'overview' && (
                    <div className="bg-white rounded-xl shadow-sm border border-[#e0e2eb] overflow-hidden flex flex-col h-[70vh]">
                        <ProjectNotes projectId={id} />
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="bg-white rounded-xl shadow-sm border border-[#e0e2eb] overflow-hidden">
                        {recordings.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f9f9ff] border-b border-[#e0e2eb] text-[#777682] text-[11px] sm:text-[12px] uppercase tracking-wider font-bold">
                                        <th className="py-3 px-4 sm:py-4 sm:px-6">Title</th>
                                        <th className="py-3 px-4 sm:py-4 sm:px-6 hidden sm:table-cell">Duration</th>
                                        <th className="py-3 px-4 sm:py-4 sm:px-6">Status</th>
                                        <th className="py-3 px-4 sm:py-4 sm:px-6 hidden md:table-cell">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recordings.map(rec => (
                                        <tr key={rec._id} onClick={() => navigate(`/app/research?recordingId=${rec._id}`)} className="border-b border-[#f1f3fc] hover:bg-[#f9f9ff] transition-colors cursor-pointer">
                                            <td className="py-3 px-4 sm:py-4 sm:px-6 text-[13px] sm:text-[14px] font-semibold text-[#181c22]">{rec.title || 'Untitled Recording'}</td>
                                            <td className="py-3 px-4 sm:py-4 sm:px-6 text-[13px] text-[#464651] hidden sm:table-cell">{rec.durationSeconds ? `${Math.round(rec.durationSeconds / 60)}m ${rec.durationSeconds % 60}s` : '--'}</td>
                                            <td className="py-3 px-4 sm:py-4 sm:px-6">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wider
                                                    ${rec.status === 'transcribed' ? 'bg-[#e6f4ea] text-[#2e7d32]' : 'bg-[#e0e2eb] text-[#464651]'}`}>
                                                    {rec.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 sm:py-4 sm:px-6 text-[12px] sm:text-[13px] text-[#777682] hidden md:table-cell">
                                                {new Date(rec.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="py-16 flex flex-col items-center justify-center text-center">
                                <span className="material-symbols-outlined text-[48px] text-[#c7c5d3] mb-4">mic_off</span>
                                <h4 className="text-[16px] font-bold text-[#181c22]">No recordings yet</h4>
                                <p className="text-[14px] text-[#777682] mt-2">Start a new session to gather data.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="bg-white rounded-xl shadow-sm border border-[#e0e2eb] overflow-hidden">
                        {reports.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f9f9ff] border-b border-[#e0e2eb] text-[#777682] text-[11px] sm:text-[12px] uppercase tracking-wider font-bold">
                                        <th className="py-3 px-4 sm:py-4 sm:px-6">Report Title</th>
                                        <th className="py-3 px-4 sm:py-4 sm:px-6">Status</th>
                                        <th className="py-3 px-4 sm:py-4 sm:px-6 hidden md:table-cell">Generated On</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map(rep => (
                                        <tr key={rep._id} className="border-b border-[#f1f3fc] hover:bg-[#f9f9ff] transition-colors cursor-pointer" onClick={() => navigate(`/app/reports/${rep._id}`)}>
                                            <td className="py-3 px-4 sm:py-4 sm:px-6 text-[13px] sm:text-[14px] font-semibold text-[#181c22] flex items-center gap-3">
                                                <span className="material-symbols-outlined text-[#222777]">description</span>
                                                {rep.title}
                                            </td>
                                            <td className="py-3 px-4 sm:py-4 sm:px-6">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wider
                                                    ${rep.status === 'completed' || rep.status === 'ready' ? 'bg-[#e6f4ea] text-[#2e7d32]' : 'bg-[#fff8e1] text-[#b45309]'}`}>
                                                    {rep.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 sm:py-4 sm:px-6 text-[12px] sm:text-[13px] text-[#777682] hidden md:table-cell">
                                                {new Date(rep.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="py-16 flex flex-col items-center justify-center text-center">
                                <span className="material-symbols-outlined text-[48px] text-[#c7c5d3] mb-4">analytics</span>
                                <h4 className="text-[16px] font-bold text-[#181c22]">No reports generated</h4>
                                <p className="text-[14px] text-[#777682] mt-2">Generate a report from your raw data.</p>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
