import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function SchemaLibrary() {
    const accessToken = useSelector((state) => state.auth?.accessToken);
    const [schemas, setSchemas] = useState([]);

    useEffect(() => {
        if (!accessToken) return;
        const fetchSchemas = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/v1/schemas', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const data = await res.json();
                if (data.schemas) {
                    setSchemas(data.schemas.map(s => ({
                        id: s._id,
                        name: s.name,
                        submissions: 0, // Not implemented in backend schema count yet
                        status: s.isActive ? 'Active' : 'Archived',
                        lastUpdated: new Date(s.updatedAt).toLocaleDateString()
                    })));
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchSchemas();
    }, [accessToken]);

    return (
        <div className="p-4 sm:p-6 md:p-8 w-full max-w-[1280px] mx-auto font-sans">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { height: 6px; }
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
                                <td className="p-3 sm:p-4 font-mono font-bold text-[#464651]">{schema.submissions}</td>
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
                                    <button className="text-[#3a3f8f] hover:text-[#222777] transition-colors p-1.5 rounded-md hover:bg-[#e0e2eb] flex items-center justify-center ml-auto">
                                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">edit</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}