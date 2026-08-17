import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';

export default function ProjectsList() {
    const navigate = useNavigate();
    const token = useSelector(state => state.auth?.accessToken);
    const [projects, setProjects] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    // Required (whenever at least one exists to pick from) - same admin-curated keywords as
    // My Learning List, tagging a project is what lets it later be shared and found by other
    // users following the same keyword.
    const [availableKeywords, setAvailableKeywords] = useState([]);
    const [selectedKeywordIds, setSelectedKeywordIds] = useState([]);
    const [keywordError, setKeywordError] = useState('');

    useEffect(() => {
        if (!token) return;
        const fetchProjects = async () => {
            try {
                const res = await api.get('/projects');
                setProjects(res.data.projects);
            } catch (err) {
                console.error("Failed to fetch projects", err);
            }
        };
        fetchProjects();
        api.get('/keywords').then((res) => setAvailableKeywords(res.data.keywords || [])).catch(() => {});
    }, [token]);

    const toggleKeyword = (keywordId) => {
        setSelectedKeywordIds((prev) => prev.includes(keywordId) ? prev.filter((id) => id !== keywordId) : [...prev, keywordId]);
        setKeywordError('');
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        // Can't require picking a keyword that doesn't exist yet - only enforced once an
        // admin has actually added at least one (mirrors the same exception the backend checks).
        if (availableKeywords.length > 0 && selectedKeywordIds.length === 0) {
            setKeywordError('Select at least one keyword.');
            return;
        }
        try {
            const res = await api.post('/projects', { name: newProjectName, description: newProjectDesc, keywords: selectedKeywordIds });
            setProjects([res.data.project, ...projects]);
            setIsCreateModalOpen(false);
            setNewProjectName('');
            setNewProjectDesc('');
            setSelectedKeywordIds([]);
            setKeywordError('');
            navigate(`/app/projects/${res.data.project._id}`);
        } catch (err) {
            setKeywordError(err.response?.data?.message || '');
            console.error("Failed to create project", err);
        }
    };

    return (
        <div className="flex-1 w-full bg-[#F4F9F8] p-4 sm:p-6 md:p-8 flex justify-center h-[calc(100vh-64px)] overflow-y-auto font-sans">
            <div className="w-full flex flex-col pb-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 sm:mb-8 border-b border-[#e0e2eb] pb-4 sm:pb-6">
                    <div className="w-full sm:w-auto">
                        <h2 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-[#075e51] tracking-tight leading-tight">Projects Hub</h2>
                        <p className="text-[13px] sm:text-[14px] md:text-[15px] text-[#464651] mt-1">Organize your research sessions, recordings, and reports.</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex-1 sm:flex-none bg-[#075e51] text-white px-5 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold shadow-sm hover:bg-[#097969] transition-colors flex items-center justify-center gap-2 shrink-0"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span> New Project
                        </button>
                    </div>
                </div>

                {projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {projects.map((project) => (
                            <div 
                                key={project.id || project._id}
                                onClick={() => navigate(`/app/projects/${project.id || project._id}`)}
                                className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 cursor-pointer hover:shadow-md hover:border-[#c7c5d3] transition-all group flex flex-col h-[180px]"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-[16px] sm:text-[18px] font-bold text-[#181c22] group-hover:text-[#075e51] transition-colors line-clamp-1">{project.name}</h3>
                                    <span className="material-symbols-outlined text-[#c7c5d3] text-[20px] group-hover:text-[#075e51] transition-colors">folder</span>
                                </div>
                                <p className="text-[13px] sm:text-[14px] text-[#777682] line-clamp-2 mb-4 flex-1">
                                    {project.description || "No description provided."}
                                </p>
                                <div className="mt-auto flex items-center gap-4 text-[12px] font-bold text-[#464651] border-t border-[#f1f3fc] pt-3">
                                    <div className="flex items-center gap-1.5 bg-[#F4F9F8] px-2 py-1 rounded">
                                        <span className="material-symbols-outlined text-[14px] text-[#777682]">mic</span>
                                        {project.counts?.recordings || 0}
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-[#F4F9F8] px-2 py-1 rounded">
                                        <span className="material-symbols-outlined text-[14px] text-[#777682]">description</span>
                                        {project.counts?.reports || 0}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-[#e0e2eb] border-dashed py-16 sm:py-24 px-4 shadow-sm mx-4 sm:mx-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#f1f3fc] rounded-full flex items-center justify-center text-[#c7c5d3] mb-3 sm:mb-4">
                            <span className="material-symbols-outlined text-[28px] sm:text-[32px]">folder_open</span>
                        </div>
                        <h3 className="text-[16px] sm:text-[18px] font-bold text-[#181c22] mb-2 text-center">No projects yet</h3>
                        <p className="text-[13px] sm:text-[14px] text-[#777682] mb-5 sm:mb-6 text-center max-w-md leading-relaxed">
                            Create a project to organize your transcripts, research data, and generated reports into dedicated folders.
                        </p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-[#075e51] text-white px-6 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold shadow-sm hover:bg-[#097969] transition-colors"
                        >
                            Create First Project
                        </button>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-[#181c22]/50 flex items-center justify-center z-[100] backdrop-blur-sm px-4">
                    <form onSubmit={handleCreateProject} className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-[#e0e2eb] flex items-center justify-between">
                            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#181c22]">Create New Project</h3>
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-[#777682] hover:text-[#181c22]">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="block text-[13px] font-bold text-[#181c22] mb-1.5">Project Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full bg-[#F4F9F8] border border-[#c7c5d3] rounded-md px-3 py-2 text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#075e51] focus:border-[#075e51] outline-none"
                                    placeholder="e.g. Q3 Customer Interviews"
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-[#181c22] mb-1.5">Description (Optional)</label>
                                <textarea
                                    value={newProjectDesc}
                                    onChange={(e) => setNewProjectDesc(e.target.value)}
                                    className="w-full bg-[#F4F9F8] border border-[#c7c5d3] rounded-md px-3 py-2 text-[14px] font-semibold text-[#181c22] focus:ring-1 focus:ring-[#075e51] focus:border-[#075e51] outline-none min-h-[80px]"
                                    placeholder="Brief details about this initiative..."
                                />
                            </div>
                            {availableKeywords.length > 0 && (
                                <div>
                                    <label className="block text-[13px] font-bold text-[#181c22] mb-1.5">Keywords</label>
                                    <p className="text-[11px] text-[#777682] mb-2">Required - lets you later share this project with users following the same keyword on My Learning List.</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {availableKeywords.map((kw) => {
                                            const isSelected = selectedKeywordIds.includes(kw._id);
                                            return (
                                                <button
                                                    key={kw._id}
                                                    type="button"
                                                    onClick={() => toggleKeyword(kw._id)}
                                                    className={`text-[12px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                                                        isSelected
                                                            ? 'bg-[#FEF9C3] text-[#006e73] border-[#6bf6ff]/50'
                                                            : 'bg-[#F4F9F8] text-[#464651] border-[#e0e2eb] hover:border-[#c7c5d3]'
                                                    }`}
                                                >
                                                    {kw.text}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {keywordError && <p className="text-[11px] text-[#ba1a1a] font-semibold mt-2">{keywordError}</p>}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-[#F4F9F8] flex justify-end gap-3 border-t border-[#e0e2eb]">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-[13px] sm:text-[14px] font-bold text-[#464651] hover:bg-[#e0e2eb] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-[#075e51] text-white px-5 py-2 rounded-lg text-[13px] sm:text-[14px] font-bold shadow-sm hover:bg-[#097969] transition-colors"
                            >
                                Create Project
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
