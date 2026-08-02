import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { useSelector } from 'react-redux';
import api from '../../services/api';

export default function UserManagement() {
    const accessToken = useSelector((state) => state.auth?.accessToken);
    // Application State
    const [users, setUsers] = useState([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Selection State
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    // Custom Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    // Modal State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmails, setInviteEmails] = useState('');
    const [inviteRole, setInviteRole] = useState('user');

    const timeAgo = (dateString) => {
        if (!dateString) return 'Never';
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        if (seconds < 60) return 'Just now';
        const interval = Math.floor(seconds / 31536000);
        if (interval > 1) return interval + ' years ago';
        const months = Math.floor(seconds / 2592000);
        if (months >= 1) return months + ' months ago';
        const days = Math.floor(seconds / 86400);
        if (days >= 1) return days + ' days ago';
        const hours = Math.floor(seconds / 3600);
        if (hours >= 1) return hours + ' hours ago';
        const minutes = Math.floor(seconds / 60);
        return minutes + ' minutes ago';
    };

    // Fetch users
    const fetchUsers = async () => {
        if (!accessToken) return;
        try {
            const params = new URLSearchParams({
                page: currentPage,
                ...(roleFilter && { role: roleFilter }),
                ...(statusFilter && { status: statusFilter }),
                ...(searchQuery && { search: searchQuery })
            });
            const res = await api.get(`/admin/users?${params.toString()}`);
            const data = res.data;
            if (data.users) {
                const formatted = data.users.map(u => {
                    const extractedName = (u.fullName === 'Pending Invite' || !u.fullName) ? u.email.split('@')[0] : u.fullName;
                    return {
                        id: u._id,
                        name: extractedName,
                        initials: extractedName.substring(0, 2).toUpperCase(),
                        email: u.email,
                        role: u.role,
                        status: u.status,
                        lastActive: timeAgo(u.lastLoginAt || u.createdAt)
                    };
                });
                setUsers(formatted);
                setTotalUsers(data.total || 0);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [accessToken, currentPage, roleFilter, statusFilter, searchQuery]);

    // --- FRONTEND LOGIC --- //

    const totalPages = Math.ceil(totalUsers / 25) || 1;

    // 1. Pagination Reset on Filter Change
    useEffect(() => {
        setCurrentPage(1);
    }, [roleFilter, statusFilter, searchQuery]);

    // 2. Checkbox Logic
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUserIds(users.filter(u => u.role !== 'admin').map(u => u.id));
        } else {
            setSelectedUserIds([]);
        }
    };

    const handleSelectUser = (id, role) => {
        if (role === 'admin') return; // Prevent selecting admins
        setSelectedUserIds(prev =>
            prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
        );
    };

    const nonAdminUsers = users.filter(u => u.role !== 'admin');
    const isAllSelected = nonAdminUsers.length > 0 && selectedUserIds.length === nonAdminUsers.length;

    // Inline Action Logic
    const handleUpdateStatus = async (id, newStatus) => {
        if (!accessToken) return;
        try {
            const res = await api.patch(`/admin/users/${id}`, { status: newStatus });
            if (res.status >= 200 && res.status < 300) {
                showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`, "success");
                await fetchUsers();
            } else {
                showToast(`Failed to update user status`, "error");
            }
        } catch (err) {
            showToast(`Failed to update user status`, "error");
        }
    };

    // 3. Bulk Action Logic
    const handleBulkRoleChange = async (newRole) => {
        if (!accessToken || !newRole) return;
        try {
            for (const id of selectedUserIds) {
                await api.patch(`/admin/users/${id}`, { role: newRole });
            }
            showToast("Roles updated successfully!", "success");
            await fetchUsers();
            setSelectedUserIds([]);
        } catch (err) {
            showToast("Failed to update roles", "error");
        }
    };

    const handleBulkDeactivate = async () => {
        if (!accessToken) return;
        try {
            for (const id of selectedUserIds) {
                await api.patch(`/admin/users/${id}`, { status: 'inactive' });
            }
            showToast("Users deactivated successfully!", "success");
            await fetchUsers(); // Refresh list
            setSelectedUserIds([]); // Clear selection
        } catch (err) {
            showToast("Failed to deactivate users", "error");
        }
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] overflow-y-auto bg-[#f9f9ff] font-sans custom-scrollbar">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col pb-20 min-h-full">

                {/* Page Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 sm:mb-6">
                    <div className="w-full md:w-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-[#222777] mb-1 tracking-tight">User Management</h2>
                        <p className="text-[#777682] text-sm sm:text-base">Manage team access, roles, and status.</p>
                    </div>
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="w-full md:w-auto bg-[#222777] text-white text-[13px] sm:text-sm font-bold py-2.5 px-6 rounded-lg hover:bg-[#3a3f8f] transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0"
                    >
                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">person_add</span>
                        Invite User
                    </button>
                </div>

                {/* Filters & Search Bar */}
                <div className="bg-white p-4 rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] flex flex-col md:flex-row gap-3 sm:gap-4 items-center justify-between mb-6">

                    {/* Search */}
                    <div className="w-full md:flex-1 relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c7c5d3] text-[20px]">search</span>
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-[#e0e2eb] rounded-lg bg-[#f9f9ff] text-[13px] sm:text-sm focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none transition-shadow text-[#181c22]"
                        />
                    </div>

                    {/* Dropdown Filters */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto">
                        <div className="relative w-full sm:w-auto sm:min-w-[140px]">
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="w-full appearance-none bg-[#f9f9ff] border border-[#e0e2eb] rounded-lg py-2 sm:py-2.5 pl-3 pr-8 text-[13px] sm:text-sm font-semibold text-[#464651] focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none cursor-pointer"
                            >
                                <option value="">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="user">User</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none text-[18px]">expand_more</span>
                        </div>

                        <div className="relative w-full sm:w-auto sm:min-w-[140px]">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full appearance-none bg-[#f9f9ff] border border-[#e0e2eb] rounded-lg py-2 sm:py-2.5 pl-3 pr-8 text-[13px] sm:text-sm font-semibold text-[#464651] focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="invited">Invited</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none text-[18px]">expand_more</span>
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] overflow-hidden flex flex-col relative w-full">

                    {/* Bulk Actions Banner */}
                    {selectedUserIds.length > 0 && (
                        <div className="absolute top-0 left-0 w-full bg-[#e6fbfc] px-4 sm:px-6 py-2.5 sm:py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between z-20 border-b border-[#00c2cb]/30 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 gap-3 sm:gap-0">
                            <span className="text-[13px] sm:text-sm font-bold text-[#006e73]">{selectedUserIds.length} users selected</span>
                            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                                <select
                                    onChange={(e) => handleBulkRoleChange(e.target.value)}
                                    className="flex-1 sm:flex-none bg-white text-[#464651] border border-[#c7c5d3] text-[11px] sm:text-xs font-bold py-1.5 px-3 rounded hover:bg-[#f1f3fc] transition-colors text-center cursor-pointer outline-none"
                                    value=""
                                >
                                    <option value="" disabled>Change Role</option>
                                    <option value="user">Make User</option>
                                    <option value="manager">Make Manager</option>
                                    {/* Exclude admin so they can't maliciously promote to admin easily, or include if desired */}
                                </select>
                                <button
                                    onClick={handleBulkDeactivate}
                                    className="flex-1 sm:flex-none bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab] text-[11px] sm:text-xs font-bold py-1.5 px-3 rounded hover:bg-[#ffdad6]/80 transition-colors flex items-center justify-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]">block</span> Deactivate
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="overflow-x-auto w-full custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[750px]">
                            <thead className="bg-[#f9f9ff] border-b border-[#e0e2eb]">
                            <tr>
                                <th className="py-3 px-4 w-[48px]">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        className="rounded border-[#c7c5d3] text-[#222777] focus:ring-[#222777] cursor-pointer w-4 h-4"
                                    />
                                </th>
                                <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-[#777682] uppercase tracking-wider whitespace-nowrap">User</th>
                                <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-[#777682] uppercase tracking-wider whitespace-nowrap">Email</th>
                                <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-[#777682] uppercase tracking-wider whitespace-nowrap">Role</th>
                                <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-[#777682] uppercase tracking-wider whitespace-nowrap">Status</th>
                                <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-[#777682] uppercase tracking-wider whitespace-nowrap">Last Active</th>
                                <th className="py-3 px-4 text-[11px] sm:text-xs font-bold text-[#777682] uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-[#e0e2eb] text-[13px] sm:text-sm">
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`hover:bg-[#f1f3fc] transition-colors group ${user.status === 'inactive' ? 'opacity-60 bg-[#f9f9ff]' : ''}`}
                                    >
                                        <td className="py-3 px-4">
                                            <input
                                                type="checkbox"
                                                disabled={user.role === 'admin'}
                                                checked={selectedUserIds.includes(user.id)}
                                                onChange={() => handleSelectUser(user.id, user.role)}
                                                className={`rounded border-[#c7c5d3] text-[#222777] focus:ring-[#222777] w-4 h-4 ${user.role === 'admin' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                            />
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold shrink-0
                                                        ${user.status === 'invited' ? 'bg-[#f1f3fc] text-[#777682] border border-[#c7c5d3] border-dashed' : 'bg-[#222777] text-white'}`}
                                                >
                                                    {user.initials}
                                                </div>
                                                <span className={`font-semibold whitespace-nowrap capitalize ${user.status === 'invited' ? 'italic text-[#777682]' : 'text-[#181c22]'} ${user.status === 'inactive' ? 'line-through' : ''}`}>
                                                        {user.name}
                                                    </span>
                                            </div>
                                        </td>
                                        <td className={`py-3 px-4 font-mono text-[11px] sm:text-xs whitespace-nowrap ${user.status === 'inactive' ? 'line-through text-[#c7c5d3]' : 'text-[#464651]'}`}>
                                            {user.email}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {/* Role Badges */}
                                            <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold border
                                                    ${user.role === 'admin' ? 'bg-[#222777] text-white border-[#222777]' : ''}
                                                    ${user.role === 'manager' ? 'bg-[#e6fbfc] text-[#006e73] border-[#00c2cb]/30' : ''}
                                                    ${user.role === 'user' ? 'bg-white text-[#464651] border-[#c7c5d3]' : ''}`}
                                            >
                                                    {user.role === 'admin' && <span className="material-symbols-outlined text-[12px]">shield</span>}
                                                {user.role === 'manager' && <span className="material-symbols-outlined text-[12px]">manage_accounts</span>}
                                                {user.role === 'user' && <span className="material-symbols-outlined text-[12px]">person</span>}
                                                {user.role}
                                                </span>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {/* Status Badges */}
                                            <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full border
                                                    ${user.status === 'active' ? 'bg-[#e6fbfc] text-[#006e73] border-[#6bf6ff]/50' : ''}
                                                    ${user.status === 'invited' ? 'bg-[#fff8e1] text-[#b45309] border-[#ffe082]' : ''}
                                                    ${user.status === 'inactive' ? 'bg-[#f1f3fc] text-[#777682] border-[#e0e2eb]' : ''}`}
                                            >
                                                    {user.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-[#00c2cb]"></span>}
                                                {user.status === 'invited' && <span className="material-symbols-outlined text-[12px]">mail</span>}
                                                {user.status === 'inactive' && <span className="material-symbols-outlined text-[12px]">block</span>}
                                                {user.status}
                                                </span>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] sm:text-xs text-[#777682] whitespace-nowrap">{user.lastActive}</td>
                                        <td className="py-3 px-4 text-right opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            {user.role === 'admin' ? (
                                                <span className="text-[10px] text-[#c7c5d3] font-bold uppercase tracking-wider">Protected</span>
                                            ) : user.status === 'inactive' ? (
                                                <button onClick={() => handleUpdateStatus(user.id, 'active')} className="text-[#c7c5d3] hover:text-[#222777] transition-colors p-1" title="Restore">
                                                    <span className="material-symbols-outlined text-[18px]">settings_backup_restore</span>
                                                </button>
                                            ) : (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button className="text-[#c7c5d3] hover:text-[#222777] transition-colors p-1" title={user.status === 'invited' ? 'Resend' : 'Edit'}>
                                                        <span className="material-symbols-outlined text-[18px]">{user.status === 'invited' ? 'send' : 'edit'}</span>
                                                    </button>
                                                    <button onClick={() => handleUpdateStatus(user.id, 'inactive')} className="text-[#c7c5d3] hover:text-[#ba1a1a] transition-colors p-1" title={user.status === 'invited' ? 'Cancel' : 'Deactivate'}>
                                                        <span className="material-symbols-outlined text-[18px]">{user.status === 'invited' ? 'close' : 'block'}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                /* Empty State when filters yield no results */
                                <tr>
                                    <td colSpan="7" className="py-12 sm:py-16 text-center text-[#777682]">
                                        <span className="material-symbols-outlined text-3xl sm:text-4xl mb-2 text-[#c7c5d3]">group_off</span>
                                        <p className="font-bold text-[13px] sm:text-sm">No users match your filters.</p>
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className="border-t border-[#e0e2eb] p-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between bg-[#f9f9ff] gap-3 sm:gap-0 mt-auto">
                            <span className="text-[11px] sm:text-xs font-semibold text-[#777682]">Showing {users.length} of {totalUsers} users</span>
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-[#c7c5d3] hover:bg-white hover:text-[#222777] transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                                >
                                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">chevron_left</span>
                                </button>
                                
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button 
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded text-[12px] sm:text-sm font-bold flex items-center justify-center transition-colors ${currentPage === page ? 'bg-[#222777] text-white' : 'text-[#464651] hover:bg-white'}`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-[#777682] hover:bg-white hover:text-[#222777] transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                                >
                                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Modal Overlay */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-[#181c22]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                        <div className="flex justify-between items-center border-b border-[#e0e2eb] px-5 sm:px-6 py-4 sm:py-5 bg-[#f9f9ff]">
                            <h3 className="text-[18px] sm:text-2xl font-bold text-[#181c22]">Invite Users</h3>
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="text-[#777682] hover:text-[#ba1a1a] transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white border border-transparent hover:border-[#e0e2eb]"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 flex flex-col gap-5 sm:gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] sm:text-xs font-bold text-[#464651] uppercase tracking-wider">Email Addresses</label>
                                <textarea
                                    value={inviteEmails}
                                    onChange={(e) => setInviteEmails(e.target.value)}
                                    className="w-full bg-[#f9f9ff] border border-[#c7c5d3] rounded-lg p-3 text-[13px] sm:text-sm focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none resize-none text-[#181c22]"
                                    placeholder="Enter emails separated by commas..."
                                    rows="3"
                                ></textarea>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] sm:text-xs font-bold text-[#464651] uppercase tracking-wider">Assign Role</label>
                                <div className="relative">
                                    <select 
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value)}
                                        className="w-full appearance-none bg-[#f9f9ff] border border-[#c7c5d3] rounded-lg py-2.5 sm:py-3 pl-3 pr-8 text-[13px] sm:text-sm focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none cursor-pointer text-[#181c22]"
                                    >
                                        <option value="user">User (Standard Access)</option>
                                        <option value="manager">Manager (Can manage projects)</option>
                                        <option value="admin">Admin (Full system access)</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none">expand_more</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-5 sm:px-6 py-4 border-t border-[#e0e2eb] bg-[#f9f9ff]">
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="px-4 sm:px-5 py-2 rounded-lg text-[13px] sm:text-sm font-bold text-[#464651] hover:bg-[#e0e2eb] transition-colors border border-transparent"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!accessToken || !inviteEmails) return;
                                    try {
                                        const emails = inviteEmails.split(',').map(e => e.trim());
                                        const res = await api.post('/admin/users/invite', { emails, role: inviteRole });
                                        const { invited = [], failed = [] } = res.data || {};
                                        if (failed.length > 0) {
                                            showToast(`Invited ${invited.length}, ${failed.length} failed: ${failed.map(f => f.email).join(', ')}`, invited.length > 0 ? "success" : "error");
                                        } else {
                                            showToast("Invites sent successfully!", "success");
                                        }
                                        setIsInviteModalOpen(false);
                                        setInviteEmails('');
                                        setInviteRole('user');
                                        fetchUsers();
                                    } catch (err) {
                                        const data = err.response?.data || {};
                                        showToast(`Failed: ${data.message || 'An error occurred'}`, "error");
                                    }
                                }}
                                className="bg-[#222777] text-white px-5 sm:px-6 py-2 rounded-lg text-[13px] sm:text-sm font-bold hover:bg-[#3a3f8f] transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">send</span> Send Invites
                            </button>
                        </div>

                    </div>
                </div>
            )}
            
            {/* --- CUSTOM TOAST NOTIFICATION --- */}
            <div className={`fixed bottom-24 right-6 z-50 transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${toast.type === 'error' ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]' : 'bg-[#e6fbfc] border-[#00c2cb] text-[#006e73]'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <span className="text-[13px] sm:text-[14px] font-bold">
                        {toast.message}
                    </span>
                    <button onClick={() => setToast(prev => ({...prev, show: false}))} className="ml-2 hover:opacity-70">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>
        </div>
    );
}