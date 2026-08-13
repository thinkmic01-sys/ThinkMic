import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Reusable "assigned students" roster manager - used both by an admin managing any
// Lecturer's roster (AdminUserDetail, hitting /admin/users/:id/students) and by a lecturer
// self-managing their own roster (SchemaLibrary, hitting /users/me/students). A student can
// be assigned to more than one lecturer (see backend User.assignedLecturers), so adding one
// here is a roster membership toggle, not an exclusive ownership transfer.
export default function StudentRosterPanel({ getEndpoint, patchEndpoint, searchEndpoint, showToast, title = 'Assigned Students', maxHeight = '520px' }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        api.get(getEndpoint)
            .then((res) => setStudents(res.data.students || []))
            .catch(() => showToast('Failed to load assigned students.', 'error'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getEndpoint]);

    useEffect(() => {
        if (query.trim().length < 2) return; // too short to search yet; clearing is handled synchronously in the input's onChange below
        const timer = setTimeout(async () => {
            try {
                const res = await api.get(searchEndpoint, { params: { search: query.trim() } });
                setResults(res.data.users || []);
                setIsDropdownOpen(true);
            } catch (err) {
                console.error(err);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, searchEndpoint]);

    const handleQueryChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        if (value.trim().length < 2) {
            setResults([]);
            setIsDropdownOpen(false);
        }
    };

    const saveStudentIds = async (nextIds) => {
        const { data } = await api.patch(patchEndpoint, { studentIds: nextIds });
        setStudents(data.students || []);
    };

    const handleAddStudent = async (user) => {
        if (students.some((s) => s._id === user._id)) return;
        setSavingId(user._id);
        setQuery('');
        setResults([]);
        setIsDropdownOpen(false);
        try {
            await saveStudentIds([...students.map((s) => s._id), user._id]);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to add student.', 'error');
        } finally {
            setSavingId(null);
        }
    };

    const handleRemoveStudent = async (studentId) => {
        setSavingId(studentId);
        try {
            await saveStudentIds(students.filter((s) => s._id !== studentId).map((s) => s._id));
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to remove student.', 'error');
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] overflow-hidden mb-5">
            <div className="px-4 sm:px-5 py-3 border-b border-[#e0e2eb] bg-[#f9f9ff] flex items-center justify-between">
                <h3 className="font-bold text-[13px] sm:text-sm text-[#222777] tracking-wide">{title}</h3>
                {!loading && <span className="text-[11px] font-mono text-[#777682]">{students.length}</span>}
            </div>
            <div className="divide-y divide-[#e0e2eb] overflow-y-auto custom-scrollbar" style={{ maxHeight }}>
                <div className="px-4 sm:px-5 py-4 relative">
                    <label className="block text-[11px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Add a Student</label>
                    <input
                        type="text"
                        value={query}
                        onChange={handleQueryChange}
                        onFocus={() => results.length > 0 && setIsDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 150)}
                        placeholder="Search by name or email..."
                        autoComplete="off"
                        className="w-full border border-[#c7c5d3] rounded-md p-2.5 text-[13px] outline-none focus:border-[#222777]"
                    />
                    {isDropdownOpen && results.length > 0 && (
                        <div className="absolute z-10 mt-1 left-4 right-4 sm:left-5 sm:right-5 bg-white border border-[#c7c5d3] rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {results.map((u) => (
                                <button
                                    key={u._id}
                                    type="button"
                                    onMouseDown={() => handleAddStudent(u)}
                                    disabled={students.some((s) => s._id === u._id)}
                                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f1f3fc] transition-colors border-b border-[#f1f3fc] last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="font-semibold text-[#181c22]">{u.fullName}</div>
                                    <div className="text-[11px] text-[#777682] font-mono">{u.email}{students.some((s) => s._id === u._id) ? ' · already assigned' : ''}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="px-4 sm:px-5 py-8 text-center text-[13px] text-[#777682]">Loading...</div>
                ) : students.length === 0 ? (
                    <div className="px-4 sm:px-5 py-8 text-center text-[#c7c5d3] text-[13px] italic">No students assigned yet.</div>
                ) : (
                    students.map((s) => (
                        <div key={s._id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-bold text-[13px] sm:text-sm text-[#181c22] truncate">{s.fullName}</p>
                                <p className="text-[11px] text-[#777682] font-mono truncate">{s.email}</p>
                            </div>
                            <button
                                onClick={() => handleRemoveStudent(s._id)}
                                disabled={savingId === s._id}
                                title="Remove student"
                                className="text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors p-1.5 rounded-md inline-flex items-center justify-center shrink-0 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[18px]">{savingId === s._id ? 'hourglass_empty' : 'close'}</span>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
