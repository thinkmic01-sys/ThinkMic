// frontend/src/pages/Management.jsx
import React, { useState } from 'react';
import {Link} from "react-router-dom";

// Mock User Database
const initialUsers = [
    { id: 1, name: 'Jane Doe', initials: 'JD', email: 'jane.doe@thinkmic.ai', role: 'admin', status: 'active', lastActive: 'Just now' },
    { id: 2, name: 'Alex Smith', initials: 'AS', email: 'alex.smith@thinkmic.ai', role: 'manager', status: 'active', lastActive: '2 hours ago' },
    { id: 3, name: 'Pending Invite', initials: '?', email: 'sam.taylor@university.edu', role: 'user', status: 'invited', lastActive: '-' },
    { id: 4, name: 'Robert Jones', initials: 'RJ', email: 'robert.j@thinkmic.ai', role: 'user', status: 'inactive', lastActive: 'Oct 12, 2026' },
    { id: 5, name: 'Michael Chang', initials: 'MC', email: 'm.chang@thinkmic.ai', role: 'user', status: 'active', lastActive: 'Yesterday' },
];

export default function UserManagement() {
    // Application State
    const [users, setUsers] = useState(initialUsers);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Selection State
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    // Modal State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmails, setInviteEmails] = useState('');

    // --- FRONTEND LOGIC --- //

    // 1. Filtering Logic
    const filteredUsers = users.filter((user) => {
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === '' || user.role === roleFilter;
        const matchesStatus = statusFilter === '' || user.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });

    // 2. Checkbox Logic
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUserIds(filteredUsers.map(u => u.id));
        } else {
            setSelectedUserIds([]);
        }
    };

    const handleSelectUser = (id) => {
        setSelectedUserIds(prev =>
            prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
        );
    };

    const isAllSelected = filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length;

    // 3. Bulk Action Logic
    const handleBulkDeactivate = () => {
        setUsers(users.map(user =>
            selectedUserIds.includes(user.id) ? { ...user, status: 'inactive' } : user
        ));
        setSelectedUserIds([]); // Clear selection after action
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col h-full">


            {/* Page Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-primary mb-1">User Management</h2>
                    <p className="text-gray-500">Manage team access, roles, and status.</p>
                </div>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-primary text-white text-sm font-bold py-2.5 px-6 rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    Invite User
                </button>
            </div>

            {/* Filters & Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between mb-6">

                {/* Search */}
                <div className="flex-1 w-full relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-[#f9f9ff] text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                    />
                </div>

                {/* Dropdown Filters */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative min-w-[140px]">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full appearance-none bg-[#f9f9ff] border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-sm font-semibold text-gray-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                        >
                            <option value="">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="user">User</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">expand_more</span>
                    </div>

                    <div className="relative min-w-[140px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full appearance-none bg-[#f9f9ff] border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-sm font-semibold text-gray-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="invited">Invited</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">expand_more</span>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">

                {/* Bulk Actions Banner (Appears when checkboxes are checked) */}
                {selectedUserIds.length > 0 && (
                    <div className="absolute top-0 left-0 w-full bg-primary/10 px-6 py-2 flex items-center justify-between z-20 border-b border-primary/20 backdrop-blur-sm animate-fade-in-up">
                        <span className="text-sm font-bold text-primary">{selectedUserIds.length} users selected</span>
                        <div className="flex gap-3">
                            <button className="bg-white text-gray-700 border border-gray-300 text-xs font-bold py-1.5 px-3 rounded hover:bg-gray-50 transition-colors">
                                Change Role
                            </button>
                            <button
                                onClick={handleBulkDeactivate}
                                className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold py-1.5 px-3 rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[16px]">block</span> Deactivate
                            </button>
                        </div>
                    </div>
                )}

                {/* Data Table */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <th className="py-3 px-4 w-[48px]">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                                />
                            </th>
                            <th className="py-3 px-4">User</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Role</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Last Active</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <tr
                                    key={user.id}
                                    className={`hover:bg-gray-50 transition-colors group ${user.status === 'inactive' ? 'opacity-60 bg-gray-50/50' : ''}`}
                                >
                                    <td className="py-3 px-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedUserIds.includes(user.id)}
                                            onChange={() => handleSelectUser(user.id)}
                                            className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                          ${user.status === 'invited' ? 'bg-gray-100 text-gray-400 border border-gray-200 border-dashed' : 'bg-primary text-white'}`}
                                            >
                                                {user.initials}
                                            </div>
                                            <span className={`font-semibold whitespace-nowrap ${user.status === 'invited' ? 'italic text-gray-500' : 'text-gray-900'} ${user.status === 'inactive' ? 'line-through' : ''}`}>
                          {user.name}
                        </span>
                                        </div>
                                    </td>
                                    <td className={`py-3 px-4 font-mono text-xs ${user.status === 'inactive' ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                                        {user.email}
                                    </td>
                                    <td className="py-3 px-4">
                                        {/* Role Badges */}
                                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold
                        ${user.role === 'admin' ? 'bg-primary text-white' : ''}
                        ${user.role === 'manager' ? 'bg-cyan-soft text-cyan border border-cyan/20' : ''}
                        ${user.role === 'user' ? 'border border-gray-200 text-gray-600 bg-white' : ''}`}
                                        >
                        {user.role === 'admin' && <span className="material-symbols-outlined text-[12px]">shield</span>}
                                            {user.role === 'manager' && <span className="material-symbols-outlined text-[12px]">manage_accounts</span>}
                                            {user.role === 'user' && <span className="material-symbols-outlined text-[12px]">person</span>}
                                            {user.role}
                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        {/* Status Badges */}
                                        <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2.5 py-1 rounded-full
                        ${user.status === 'active' ? 'bg-green-100 text-green-700' : ''}
                        ${user.status === 'invited' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${user.status === 'inactive' ? 'bg-gray-200 text-gray-600' : ''}`}
                                        >
                        {user.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>}
                                            {user.status === 'invited' && <span className="material-symbols-outlined text-[12px]">mail</span>}
                                            {user.status === 'inactive' && <span className="material-symbols-outlined text-[12px]">block</span>}
                                            {user.status}
                      </span>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-xs text-gray-500">{user.lastActive}</td>
                                    <td className="py-3 px-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        {user.status === 'inactive' ? (
                                            <button className="text-gray-400 hover:text-primary transition-colors p-1" title="Restore">
                                                <span className="material-symbols-outlined text-[18px]">settings_backup_restore</span>
                                            </button>
                                        ) : (
                                            <>
                                                <button className="text-gray-400 hover:text-primary transition-colors p-1" title={user.status === 'invited' ? 'Resend' : 'Edit'}>
                                                    <span className="material-symbols-outlined text-[18px]">{user.status === 'invited' ? 'send' : 'edit'}</span>
                                                </button>
                                                <button className="text-gray-400 hover:text-red-500 transition-colors p-1 ml-1" title={user.status === 'invited' ? 'Cancel' : 'Deactivate'}>
                                                    <span className="material-symbols-outlined text-[18px]">{user.status === 'invited' ? 'close' : 'block'}</span>
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            /* Empty State when filters yield no results */
                            <tr>
                                <td colSpan="7" className="py-12 text-center text-gray-500">
                                    <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">group_off</span>
                                    <p className="font-bold">No users match your filters.</p>
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="border-t border-gray-200 p-3 px-6 flex items-center justify-between bg-white mt-auto">
                    <span className="text-xs font-semibold text-gray-500">Showing {filteredUsers.length} users</span>
                    <div className="flex gap-1">
                        <button className="w-8 h-8 rounded flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"><span className="material-symbols-outlined">chevron_left</span></button>
                        <button className="w-8 h-8 rounded bg-primary text-white text-sm font-bold flex items-center justify-center">1</button>
                        <button className="w-8 h-8 rounded hover:bg-gray-50 text-gray-700 text-sm font-bold flex items-center justify-center transition-colors">2</button>
                        <button className="w-8 h-8 rounded hover:bg-gray-50 text-gray-700 text-sm font-bold flex items-center justify-center transition-colors">3</button>
                        <button className="w-8 h-8 rounded flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"><span className="material-symbols-outlined">chevron_right</span></button>
                    </div>
                </div>
            </div>

            {/* Invite Modal Overlay */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-[#1E2255]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 md:p-8 flex flex-col gap-6 animate-fade-in-up">

                        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                            <h3 className="text-2xl font-bold text-gray-900">Invite Users</h3>
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Addresses</label>
                            <textarea
                                value={inviteEmails}
                                onChange={(e) => setInviteEmails(e.target.value)}
                                className="w-full bg-[#f9f9ff] border border-gray-200 rounded-lg p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                                placeholder="Enter emails separated by commas..."
                                rows="3"
                            ></textarea>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Assign Role</label>
                            <div className="relative">
                                <select className="w-full appearance-none bg-[#f9f9ff] border border-gray-200 rounded-lg py-2.5 pl-3 pr-8 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer">
                                    <option value="user">User (Standard Access)</option>
                                    <option value="manager">Manager (Can manage projects)</option>
                                    <option value="admin">Admin (Full system access)</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    alert("Invites sent successfully!");
                                    setIsInviteModalOpen(false);
                                    setInviteEmails('');
                                }}
                                className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-opacity-90 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">send</span> Send Invites
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}