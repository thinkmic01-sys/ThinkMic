import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function RolesManagement() {
    const [roles, setRoles] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null); // null = creating new
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPermissions, setFormPermissions] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [rolesRes, catalogRes] = await Promise.all([
                api.get('/admin/roles'),
                api.get('/admin/roles/catalog')
            ]);
            setRoles(rolesRes.data.roles || []);
            setCatalog(catalogRes.data.permissions || []);
        } catch (err) {
            showToast('Failed to load roles.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const categories = [...new Set(catalog.map((p) => p.category))];

    const openCreateModal = () => {
        setEditingRole(null);
        setFormName('');
        setFormDescription('');
        setFormPermissions([]);
        setIsModalOpen(true);
    };

    const openEditModal = (role) => {
        setEditingRole(role);
        setFormName(role.name);
        setFormDescription(role.description || '');
        setFormPermissions(role.permissions || []);
        setIsModalOpen(true);
    };

    const togglePermission = (key) => {
        setFormPermissions((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
    };

    const toggleCategory = (category, allKeysInCategory) => {
        const allSelected = allKeysInCategory.every((k) => formPermissions.includes(k));
        setFormPermissions((prev) => allSelected
            ? prev.filter((k) => !allKeysInCategory.includes(k))
            : [...new Set([...prev, ...allKeysInCategory])]);
    };

    const handleSave = async () => {
        if (!formName.trim()) {
            showToast('Role name is required.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            if (editingRole) {
                await api.patch(`/admin/roles/${editingRole._id}`, {
                    name: formName, description: formDescription, permissions: formPermissions
                });
                showToast('Role updated.', 'success');
            } else {
                await api.post('/admin/roles', {
                    name: formName, description: formDescription, permissions: formPermissions
                });
                showToast('Role created.', 'success');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to save role.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (role) => {
        try {
            await api.delete(`/admin/roles/${role._id}`);
            showToast('Role deleted.', 'success');
            fetchData();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete role.', 'error');
        }
    };

    return (
        <div className="w-full p-4 sm:p-6 md:p-8 flex flex-col pb-20 min-h-full">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 sm:mb-6">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#222777] mb-1 tracking-tight">Roles & Permissions</h2>
                    <p className="text-[#777682] text-sm sm:text-base">Create unlimited custom roles and decide exactly which admin powers each one carries.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="w-full md:w-auto bg-[#222777] text-white text-[13px] sm:text-sm font-bold py-2.5 px-6 rounded-lg hover:bg-[#3a3f8f] transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0"
                >
                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">add</span>
                    New Role
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] overflow-hidden">
                <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[650px]">
                        <thead className="bg-[#f9f9ff] border-b border-[#e0e2eb]">
                            <tr>
                                <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-[#777682] uppercase tracking-wider">Role</th>
                                <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-[#777682] uppercase tracking-wider">Description</th>
                                <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-[#777682] uppercase tracking-wider">Permissions</th>
                                <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-[#777682] uppercase tracking-wider">Users</th>
                                <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-[#777682] uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e0e2eb] text-[13px] sm:text-sm">
                            {isLoading ? (
                                <tr><td colSpan="5" className="py-12 text-center text-[#777682]">Loading roles...</td></tr>
                            ) : roles.length === 0 ? (
                                <tr><td colSpan="5" className="py-12 text-center text-[#777682]">No roles found.</td></tr>
                            ) : roles.map((role) => (
                                <tr key={role._id} className="hover:bg-[#f1f3fc] transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-[#181c22]">{role.name}</span>
                                            {role.isSystem && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f1f3fc] text-[#777682] border border-[#e0e2eb]">System</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-[#464651] max-w-[280px] truncate">{role.description || '—'}</td>
                                    <td className="py-3 px-4 font-mono text-[#777682]">{role.permissions.length}</td>
                                    <td className="py-3 px-4 font-mono text-[#777682]">{role.userCount}</td>
                                    <td className="py-3 px-4 text-right">
                                        {role.slug === 'admin' ? (
                                            <span className="text-[10px] text-[#c7c5d3] font-bold uppercase tracking-wider">Protected</span>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEditModal(role)} className="text-[#c7c5d3] hover:text-[#222777] transition-colors p-1" title="Edit">
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(role)} className="text-[#c7c5d3] hover:text-[#ba1a1a] transition-colors p-1" title="Delete">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                        <div className="px-5 sm:px-6 py-4 border-b border-[#e0e2eb] flex items-center justify-between shrink-0">
                            <h3 className="font-bold text-lg text-[#222777]">{editingRole ? 'Edit Role' : 'New Role'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#777682] hover:text-[#181c22]">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                            <div>
                                <label className="block text-[12px] font-bold text-[#777682] uppercase tracking-wide mb-1.5">Role Name</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. Support Lead"
                                    className="w-full border border-[#c7c5d3] rounded-md py-2 px-3 text-[14px] outline-none focus:border-[#222777]"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#777682] uppercase tracking-wide mb-1.5">Description</label>
                                <input
                                    type="text"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="What is this role for?"
                                    className="w-full border border-[#c7c5d3] rounded-md py-2 px-3 text-[14px] outline-none focus:border-[#222777]"
                                />
                            </div>

                            <div>
                                <label className="block text-[12px] font-bold text-[#777682] uppercase tracking-wide mb-2">Permissions</label>
                                <div className="space-y-4">
                                    {categories.map((category) => {
                                        const permsInCategory = catalog.filter((p) => p.category === category);
                                        const keysInCategory = permsInCategory.map((p) => p.key);
                                        const allSelected = keysInCategory.every((k) => formPermissions.includes(k));
                                        return (
                                            <div key={category} className="border border-[#e0e2eb] rounded-lg overflow-hidden">
                                                <div className="bg-[#f9f9ff] px-3 py-2 flex items-center justify-between">
                                                    <span className="font-bold text-[13px] text-[#222777]">{category}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCategory(category, keysInCategory)}
                                                        className="text-[11px] font-bold text-[#00a0a8] hover:text-[#006e73]"
                                                    >
                                                        {allSelected ? 'Deselect all' : 'Select all'}
                                                    </button>
                                                </div>
                                                <div className="p-3 space-y-2">
                                                    {permsInCategory.map((perm) => (
                                                        <label key={perm.key} className="flex items-start gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={formPermissions.includes(perm.key)}
                                                                onChange={() => togglePermission(perm.key)}
                                                                className="mt-0.5 rounded border-[#c7c5d3] text-[#222777] focus:ring-[#222777] w-4 h-4 cursor-pointer"
                                                            />
                                                            <span>
                                                                <span className="block text-[13px] font-semibold text-[#181c22]">{perm.label}</span>
                                                                <span className="block text-[11px] text-[#777682]">{perm.description}</span>
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="px-5 sm:px-6 py-4 border-t border-[#e0e2eb] flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="text-[13px] font-bold text-[#777682] hover:text-[#181c22] px-4 py-2">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-[#222777] text-white text-[13px] font-bold px-5 py-2 rounded-md hover:bg-[#3a3f8f] transition-colors disabled:opacity-60"
                            >
                                {isSaving ? 'Saving...' : editingRole ? 'Save Changes' : 'Create Role'}
                            </button>
                        </div>
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
