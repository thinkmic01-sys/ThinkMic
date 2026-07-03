// frontend/src/pages/SchemaLibrary.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function SchemaLibrary() {
    // Mock data for the schemas list
    const mockSchemas = [
        { id: 1, name: "Patient Intake Form", submissions: 142, status: "Draft", lastUpdated: "2 mins ago" },
        { id: 2, name: "Weekly Research Log", submissions: 856, status: "Active", lastUpdated: "4 days ago" },
        { id: 3, name: "Hardware Request", submissions: 12, status: "Archived", lastUpdated: "1 month ago" }
    ];

    return (
        <div className="p-8 w-full max-w-[1280px] mx-auto">

            {/* Sub-Navigation Tabs */}
            <div className="flex gap-8 border-b border-[#e0e2eb] mb-8">
                <Link to="/app/admin/users" className="text-[#777682] font-bold pb-3 hover:text-[#222777] transition-colors">
                    Users
                </Link>
                <Link to="/app/admin/schemas" className="border-b-[3px] border-[#222777] text-[#222777] font-bold pb-3">
                    Form Schemas
                </Link>
            </div>

            {/* Page Header & Actions */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#222777]">Schema Library</h1>
                    <p className="text-sm font-semibold text-[#777682] mt-1">Manage and create custom data collection forms.</p>
                </div>
                {/* THIS is the button that takes you to the Builder! */}
                <Link
                    to="/app/admin/schemas/new"
                    className="bg-[#222777] text-white font-bold text-sm px-5 py-2.5 rounded-md shadow-sm hover:bg-[#3a3f8f] transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    New Schema
                </Link>
            </div>

            {/* Schemas Table */}
            <div className="bg-white border border-[#e0e2eb] rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-[#f9f9ff] border-b border-[#e0e2eb] text-[#464651] font-bold text-[13px] uppercase tracking-wider">
                        <th className="p-4 pl-6">Form Name</th>
                        <th className="p-4">Submissions</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Last Updated</th>
                        <th className="p-4 text-right pr-6">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="text-sm">
                    {mockSchemas.map((schema) => (
                        <tr key={schema.id} className="border-b border-[#e0e2eb] hover:bg-[#f1f3fc] transition-colors group">
                            <td className="p-4 pl-6 font-bold text-[#181c22]">{schema.name}</td>
                            <td className="p-4 font-mono font-bold text-[#464651]">{schema.submissions}</td>
                            <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider
                                        ${schema.status === 'Active' ? 'bg-[#e6fbfc] text-[#006e73]' : ''}
                                        ${schema.status === 'Draft' ? 'bg-[#ffdad6] text-[#93000a]' : ''}
                                        ${schema.status === 'Archived' ? 'bg-[#e0e2eb] text-[#464651]' : ''}
                                    `}>
                                        {schema.status}
                                    </span>
                            </td>
                            <td className="p-4 text-[#777682] font-semibold">{schema.lastUpdated}</td>
                            <td className="p-4 text-right pr-6">
                                <button className="text-[#3a3f8f] hover:text-[#222777] transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}