import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import StudentRosterPanel from '../../components/StudentRosterPanel';

export default function SchemaLibrary() {
    const accessToken = useSelector((state) => state.auth?.accessToken);
    const permissions = useSelector((state) => state.auth?.user?.permissions) || [];
    // A Lecturer (schemas.manage_own only, not the blanket schemas.manage) manages their own
    // roster right here, since this is the page their sidebar "Schemas" link lands on.
    const canManageOwnRoster = !permissions.includes('schemas.manage') && permissions.includes('schemas.manage_own');
    const [schemas, setSchemas] = useState([]);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    const [viewingSchema, setViewingSchema] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [submissionsPage, setSubmissionsPage] = useState(1);
    const [submissionsPages, setSubmissionsPages] = useState(1);
    const [submissionsTotal, setSubmissionsTotal] = useState(0);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        if (!accessToken) return;
        const fetchSchemas = async () => {
            try {
                const res = await api.get('/schemas');
                const data = res.data;
                if (data.schemas) {
                    setSchemas(data.schemas.map(s => ({
                        id: s._id,
                        name: s.name,
                        fields: s.fields || [],
                        submissions: s.submissions || 0,
                        status: s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : 'Unknown',
                        lastUpdated: new Date(s.updatedAt).toLocaleDateString()
                    })));
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchSchemas();
    }, [accessToken]);

    useEffect(() => {
        if (!viewingSchema) return;
        let cancelled = false;
        const fetchSubmissions = async () => {
            setSubmissionsLoading(true);
            try {
                const res = await api.get('/submissions', {
                    params: { schemaId: viewingSchema.id, page: submissionsPage }
                });
                if (cancelled) return;
                setSubmissions(res.data.submissions || []);
                setSubmissionsPages(res.data.pages || 1);
                setSubmissionsTotal(res.data.total || 0);
            } catch (err) {
                console.error(err);
                if (!cancelled) { setSubmissions([]); setSubmissionsPages(1); setSubmissionsTotal(0); }
            } finally {
                if (!cancelled) setSubmissionsLoading(false);
            }
        };
        fetchSubmissions();
        return () => { cancelled = true; };
    }, [viewingSchema, submissionsPage]);

    const openSubmissions = (schema) => {
        setExpandedId(null);
        setSubmissionsPage(1);
        setViewingSchema(schema);
    };

    const closeSubmissions = () => {
        setViewingSchema(null);
        setSubmissions([]);
        setExpandedId(null);
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 font-sans">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            {/* Page Header & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#222777] tracking-tight">Schema Library</h1>
                    <p className="text-[13px] sm:text-sm font-semibold text-[#777682] mt-1">Manage and create custom data collection forms.</p>
                </div>
                {/* THIS is the button that takes you to the Builder! */}
                <Link
                    to="/app/admin/schemas/new"
                    className="w-full sm:w-auto bg-[#222777] text-white font-bold text-[13px] sm:text-sm px-5 py-2.5 rounded-md shadow-sm hover:bg-[#3a3f8f] transition-colors flex items-center justify-center gap-2 shrink-0"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    New Schema
                </Link>
            </div>

            {canManageOwnRoster && (
                <StudentRosterPanel
                    getEndpoint="/users/me/students"
                    patchEndpoint="/users/me/students"
                    searchEndpoint="/users/search-students"
                    showToast={showToast}
                    title="My Students"
                    maxHeight="70vh"
                />
            )}

            {/* Schemas Table */}
            <div className="bg-white border border-[#e0e2eb] rounded-lg shadow-[0_1px_4px_rgba(58,63,143,0.05)] overflow-hidden w-full flex flex-col">
                <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                        <tr className="bg-[#f9f9ff] border-b border-[#e0e2eb] text-[#464651] font-bold text-[11px] sm:text-[12px] md:text-[13px] uppercase tracking-wider whitespace-nowrap">
                            <th className="p-3 sm:p-4 pl-4 sm:pl-6">Form Name</th>
                            <th className="p-3 sm:p-4">Submissions</th>
                            <th className="p-3 sm:p-4">Status</th>
                            <th className="p-3 sm:p-4">Last Updated</th>
                            <th className="p-3 sm:p-4 text-right pr-4 sm:pr-6">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="text-[13px] sm:text-sm">
                        {schemas.length === 0 ? (
                            <tr><td colSpan="5" className="p-6 text-center text-[#777682] font-semibold">No schemas found. Create one to get started.</td></tr>
                        ) : schemas.map((schema) => (
                            <tr key={schema.id} className="border-b border-[#e0e2eb] hover:bg-[#f1f3fc] transition-colors group">
                                <td className="p-3 sm:p-4 pl-4 sm:pl-6 font-bold text-[#181c22] whitespace-nowrap">{schema.name}</td>
                                <td className="p-3 sm:p-4">
                                    {schema.submissions > 0 ? (
                                        <button
                                            onClick={() => openSubmissions(schema)}
                                            className="font-mono font-bold text-[#3a3f8f] hover:text-[#222777] underline decoration-dotted underline-offset-2 transition-colors"
                                            title="View submitted results"
                                        >
                                            {schema.submissions}
                                        </button>
                                    ) : (
                                        <span className="font-mono font-bold text-[#464651]">{schema.submissions}</span>
                                    )}
                                </td>
                                <td className="p-3 sm:p-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider
                                            ${schema.status === 'Active' ? 'bg-[#e6fbfc] text-[#006e73]' : ''}
                                            ${schema.status === 'Draft' ? 'bg-[#ffdad6] text-[#93000a]' : ''}
                                            ${schema.status === 'Archived' ? 'bg-[#e0e2eb] text-[#464651]' : ''}
                                        `}>
                                            {schema.status}
                                        </span>
                                </td>
                                <td className="p-3 sm:p-4 text-[#777682] font-semibold whitespace-nowrap">{schema.lastUpdated}</td>
                                <td className="p-3 sm:p-4 text-right pr-4 sm:pr-6">
                                    {schema.submissions > 0 && (
                                        <button
                                            onClick={() => openSubmissions(schema)}
                                            title="View submitted results"
                                            className="text-[#3a3f8f] hover:text-[#222777] transition-colors p-1.5 rounded-md hover:bg-[#e0e2eb] inline-flex items-center justify-center mr-1"
                                        >
                                            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">visibility</span>
                                        </button>
                                    )}
                                    {schema.status === 'Draft' ? (
                                        <Link to={`/app/admin/schemas/edit/${schema.id}`} className="text-[#3a3f8f] hover:text-[#222777] transition-colors p-1.5 rounded-md hover:bg-[#e0e2eb] inline-flex items-center justify-center ml-auto">
                                            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">edit</span>
                                        </Link>
                                    ) : (
                                        <button disabled title="Active schemas cannot be edited" className="text-[#c7c5d3] p-1.5 rounded-md inline-flex items-center justify-center ml-auto cursor-not-allowed">
                                            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">edit</span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewingSchema && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeSubmissions}>
                    <div
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-[#e0e2eb]">
                            <div>
                                <h2 className="text-lg font-bold text-[#222777]">{viewingSchema.name}</h2>
                                <p className="text-[12px] font-semibold text-[#777682] mt-0.5">
                                    {submissionsTotal} submitted result{submissionsTotal === 1 ? '' : 's'}
                                </p>
                            </div>
                            <button onClick={closeSubmissions} className="text-[#777682] hover:text-[#181c22] p-1 rounded-md hover:bg-[#f1f3fc]">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-3">
                            {submissionsLoading ? (
                                <p className="text-center text-[13px] font-semibold text-[#777682] py-8">Loading submissions…</p>
                            ) : submissions.length === 0 ? (
                                <p className="text-center text-[13px] font-semibold text-[#777682] py-8">No submissions found.</p>
                            ) : submissions.map((sub) => {
                                const isExpanded = expandedId === sub._id;
                                const submitter = sub.userId?.fullName || sub.userId?.email || 'Unknown user';
                                const when = sub.submittedAt || sub.createdAt;
                                return (
                                    <div key={sub._id} className="border border-[#e0e2eb] rounded-md overflow-hidden">
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : sub._id)}
                                            className="w-full flex items-center justify-between gap-3 p-3 hover:bg-[#f9f9ff] transition-colors text-left"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-bold text-[#181c22] text-[13px] truncate">{submitter}</p>
                                                <p className="text-[11px] text-[#777682] font-semibold">
                                                    {when ? new Date(when).toLocaleString() : '—'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                                                    ${sub.status === 'submitted' ? 'bg-[#e6fbfc] text-[#006e73]' : 'bg-[#ffdad6] text-[#93000a]'}`}>
                                                    {sub.status}
                                                </span>
                                                <span className="material-symbols-outlined text-[18px] text-[#777682]">
                                                    {isExpanded ? 'expand_less' : 'expand_more'}
                                                </span>
                                            </div>
                                        </button>
                                        {isExpanded && (
                                            <div className="border-t border-[#e0e2eb] bg-[#f9f9ff] p-3 space-y-2.5">
                                                {viewingSchema.fields.length === 0 ? (
                                                    <p className="text-[12px] text-[#777682] font-semibold">This form has no fields defined.</p>
                                                ) : viewingSchema.fields.map((field) => {
                                                    const answer = sub.answers ? sub.answers[field.id] : null;
                                                    return (
                                                        <div key={field.id}>
                                                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#464651]">{field.label}</p>
                                                            {!answer ? (
                                                                <p className="text-[13px] text-[#c7c5d3] italic">No answer</p>
                                                            ) : answer.type === 'voice' ? (
                                                                <p className="text-[13px] text-[#181c22]">
                                                                    {answer.value || '[Voice response]'}
                                                                    <span className="ml-1 text-[11px] text-[#777682]">(voice)</span>
                                                                </p>
                                                            ) : (
                                                                <p className="text-[13px] text-[#181c22] whitespace-pre-wrap break-words">{answer.value || '—'}</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {submissionsPages > 1 && (
                            <div className="flex items-center justify-between p-3 sm:p-4 border-t border-[#e0e2eb]">
                                <button
                                    onClick={() => setSubmissionsPage((p) => Math.max(1, p - 1))}
                                    disabled={submissionsPage <= 1}
                                    className="text-[12px] font-bold text-[#3a3f8f] disabled:text-[#c7c5d3] disabled:cursor-not-allowed px-3 py-1.5 rounded-md hover:bg-[#f1f3fc]"
                                >
                                    Previous
                                </button>
                                <span className="text-[12px] font-semibold text-[#777682]">
                                    Page {submissionsPage} of {submissionsPages}
                                </span>
                                <button
                                    onClick={() => setSubmissionsPage((p) => Math.min(submissionsPages, p + 1))}
                                    disabled={submissionsPage >= submissionsPages}
                                    className="text-[12px] font-bold text-[#3a3f8f] disabled:text-[#c7c5d3] disabled:cursor-not-allowed px-3 py-1.5 rounded-md hover:bg-[#f1f3fc]"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {toast.show && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-[13px] font-bold ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#222777]'}`}>
                    {toast.message}
                </div>
            )}

        </div>
    );
}