import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'research', label: 'Recordings & Transcripts' },
    { key: 'reports', label: 'Reports' },
    { key: 'notes', label: 'Notes & Projects' },
    { key: 'seminars', label: 'Seminars' },
    { key: 'collaboration', label: 'Collaboration' },
    { key: 'coins', label: 'Coins & Referrals' },
    { key: 'timeline', label: 'Timeline & Achievements' },
    { key: 'tickets', label: 'Support Tickets' }
];

const formatDate = (d) => d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const SectionCard = ({ title, count, children }) => (
    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] overflow-hidden mb-5">
        <div className="px-4 sm:px-5 py-3 border-b border-[#e0e2eb] bg-[#f9f9ff] flex items-center justify-between">
            <h3 className="font-bold text-[13px] sm:text-sm text-[#222777] tracking-wide">{title}</h3>
            {count !== undefined && <span className="text-[11px] font-mono text-[#777682]">{count}</span>}
        </div>
        <div className="divide-y divide-[#e0e2eb] max-h-[520px] overflow-y-auto custom-scrollbar">{children}</div>
    </div>
);

const EmptyRow = ({ label }) => (
    <div className="px-4 sm:px-5 py-8 text-center text-[#c7c5d3] text-[13px] italic">{label}</div>
);

const Pill = ({ children, tone = 'default' }) => {
    const tones = {
        default: 'bg-[#f1f3fc] text-[#464651] border-[#e0e2eb]',
        good: 'bg-[#e6fbfc] text-[#006e73] border-[#6bf6ff]/50',
        warn: 'bg-[#fff8e1] text-[#b45309] border-[#ffe082]',
        bad: 'bg-[#ffdad6] text-[#ba1a1a] border-[#ffb4ab]'
    };
    return <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${tones[tone] || tones.default}`}>{children}</span>;
};

export default function AdminUserDetail() {
    const { userId } = useParams();

    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState(null);

    const [activeTab, setActiveTab] = useState('overview');
    const [tabData, setTabData] = useState({});
    const [tabLoading, setTabLoading] = useState({});

    const [editingRole, setEditingRole] = useState(false);
    const [roleValue, setRoleValue] = useState('user');
    const [isSavingRole, setIsSavingRole] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    useEffect(() => {
        const fetchProfile = async () => {
            setLoadingProfile(true);
            setProfileError(null);
            try {
                const { data } = await api.get(`/admin/users/${userId}/profile`);
                setProfile(data.user);
                setRoleValue(data.user.role);
            } catch (err) {
                setProfileError(err.response?.data?.message || 'Failed to load this user.');
            } finally {
                setLoadingProfile(false);
            }
        };
        fetchProfile();
    }, [userId]);

    useEffect(() => {
        if (activeTab === 'overview' || tabData[activeTab] !== undefined) return;
        const loadTab = async () => {
            setTabLoading((prev) => ({ ...prev, [activeTab]: true }));
            try {
                const { data } = await api.get(`/admin/users/${userId}/${activeTab}`);
                setTabData((prev) => ({ ...prev, [activeTab]: data }));
            } catch (err) {
                showToast('Failed to load this section.', 'error');
            } finally {
                setTabLoading((prev) => ({ ...prev, [activeTab]: false }));
            }
        };
        loadTab();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, userId]);

    const handleUpdateStatus = async (status) => {
        try {
            const { data } = await api.patch(`/admin/users/${userId}`, { status });
            setProfile((prev) => ({ ...prev, status: data.user.status }));
            showToast(status === 'active' ? 'User restored.' : 'User deactivated.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update status.', 'error');
        }
    };

    const handleSaveRole = async () => {
        setIsSavingRole(true);
        try {
            const { data } = await api.patch(`/admin/users/${userId}`, { role: roleValue });
            setProfile((prev) => ({ ...prev, role: data.user.role }));
            setEditingRole(false);
            showToast('Role updated.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update role.', 'error');
        } finally {
            setIsSavingRole(false);
        }
    };

    if (loadingProfile) {
        return (
            <div className="w-full p-4 sm:p-6 md:p-8">
                <div className="h-24 bg-white rounded-xl border border-[#e0e2eb] animate-pulse mb-6" />
                <div className="h-64 bg-white rounded-xl border border-[#e0e2eb] animate-pulse" />
            </div>
        );
    }

    if (profileError || !profile) {
        return (
            <div className="w-full p-4 sm:p-6 md:p-8 text-center py-20">
                <span className="material-symbols-outlined text-4xl text-[#c7c5d3] mb-2">person_off</span>
                <p className="font-bold text-[#464651]">{profileError || 'User not found.'}</p>
            </div>
        );
    }

    const extractedName = (profile.fullName === 'Pending Invite' || !profile.fullName) ? profile.email.split('@')[0] : profile.fullName;
    const initials = extractedName.substring(0, 2).toUpperCase();

    return (
        <div className="w-full p-4 sm:p-6 md:p-8 pb-20">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>
            {/* Profile Header */}
            <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 sm:p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                    <div className="w-14 h-14 rounded-full bg-[#222777] text-white flex items-center justify-center text-lg font-bold shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h1 className="text-xl sm:text-2xl font-bold text-[#181c22] capitalize truncate">{extractedName}</h1>
                            <Pill tone={profile.role === 'admin' ? 'good' : 'default'}>{profile.role}</Pill>
                            <Pill tone={profile.status === 'active' ? 'good' : profile.status === 'invited' ? 'warn' : 'bad'}>{profile.status}</Pill>
                        </div>
                        <p className="text-[#777682] text-[13px] sm:text-sm font-mono truncate">{profile.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {profile.role !== 'admin' && (
                            <>
                                <button
                                    onClick={() => setEditingRole(true)}
                                    className="text-[12px] sm:text-[13px] font-bold text-[#222777] border border-[#e0e2eb] hover:bg-[#f1f3fc] transition-colors px-3 py-2 rounded-md flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[16px]">edit</span> Change Role
                                </button>
                                {profile.status === 'inactive' ? (
                                    <button
                                        onClick={() => handleUpdateStatus('active')}
                                        className="text-[12px] sm:text-[13px] font-bold text-[#006e73] border border-[#6bf6ff]/50 bg-[#e6fbfc] hover:bg-[#d0f6f8] transition-colors px-3 py-2 rounded-md flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">settings_backup_restore</span> Restore
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleUpdateStatus('inactive')}
                                        className="text-[12px] sm:text-[13px] font-bold text-[#ba1a1a] border border-[#ffb4ab] bg-[#ffdad6] hover:bg-[#ffc9c4] transition-colors px-3 py-2 rounded-md flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">block</span> Deactivate
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {editingRole && (
                    <div className="mt-4 pt-4 border-t border-[#e0e2eb] flex flex-wrap items-center gap-3">
                        <select
                            value={roleValue}
                            onChange={(e) => setRoleValue(e.target.value)}
                            className="border border-[#c7c5d3] rounded-md py-2 px-3 text-[13px] font-semibold text-[#464651] outline-none focus:border-[#222777]"
                        >
                            <option value="user">User</option>
                            <option value="manager">Manager</option>
                        </select>
                        <button
                            onClick={handleSaveRole}
                            disabled={isSavingRole}
                            className="bg-[#222777] text-white text-[13px] font-bold px-4 py-2 rounded-md hover:bg-[#3a3f8f] transition-colors disabled:opacity-60"
                        >
                            {isSavingRole ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingRole(false)} className="text-[13px] font-bold text-[#777682] hover:text-[#181c22] px-3 py-2">
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 overflow-x-auto custom-scrollbar mb-5 border-b border-[#e0e2eb]">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`whitespace-nowrap px-3 sm:px-4 py-2.5 text-[12px] sm:text-[13px] font-bold border-b-2 transition-colors ${
                            activeTab === tab.key
                                ? 'border-[#222777] text-[#222777]'
                                : 'border-transparent text-[#777682] hover:text-[#464651]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && <OverviewTab profile={profile} />}
            {activeTab !== 'overview' && (
                tabLoading[activeTab] ? (
                    <div className="space-y-3">
                        {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-white rounded-lg border border-[#e0e2eb] animate-pulse" />)}
                    </div>
                ) : (
                    <>
                        {activeTab === 'research' && <ResearchTab data={tabData.research} />}
                        {activeTab === 'reports' && <ReportsTab data={tabData.reports} />}
                        {activeTab === 'notes' && <NotesTab data={tabData.notes} />}
                        {activeTab === 'seminars' && <SeminarsTab data={tabData.seminars} />}
                        {activeTab === 'collaboration' && <CollaborationTab data={tabData.collaboration} />}
                        {activeTab === 'coins' && <CoinsTab data={tabData.coins} />}
                        {activeTab === 'timeline' && <TimelineTab data={tabData.timeline} />}
                        {activeTab === 'tickets' && <TicketsTab data={tabData.tickets} />}
                    </>
                )
            )}

            {toast.show && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-[13px] font-bold ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#222777]'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}

function OverviewTab({ profile }) {
    const rows = [
        ['Title', profile.title || '—'],
        ['Preferred Language', profile.preferredLanguage || '—'],
        ['Coins', profile.coins ?? 0],
        ['Held Coins', profile.heldCoins ?? 0],
        ['Lifetime Coins', profile.lifetimeCoins ?? 0],
        ['Referral Code', profile.referralCode || '—'],
        ['Referred By', profile.referredBy ? `${profile.referredBy.fullName} (${profile.referredBy.email})` : '—'],
        ['Last Login', formatDate(profile.lastLoginAt)],
        ['Member Since', formatDate(profile.createdAt)]
    ];
    return (
        <SectionCard title="Profile Details">
            {rows.map(([label, value]) => (
                <div key={label} className="px-4 sm:px-5 py-3 flex items-center justify-between text-[13px] sm:text-sm">
                    <span className="text-[#777682] font-semibold">{label}</span>
                    <span className="text-[#181c22] font-mono text-right truncate max-w-[60%]">{value}</span>
                </div>
            ))}
        </SectionCard>
    );
}

function ResearchTab({ data }) {
    if (!data || data.recordings.length === 0) return <SectionCard title="Recordings"><EmptyRow label="No recordings yet." /></SectionCard>;
    return (
        <SectionCard title="Recordings & Transcripts" count={data.total}>
            {data.recordings.map((rec) => {
                const transcriptText = rec.transcriptId?.editedText || rec.transcriptId?.text;
                const summaryText = rec.summaryId?.editedSummaryText || rec.summaryId?.summaryText;
                return (
                    <div key={rec._id} className="px-4 sm:px-5 py-4">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-[13px] sm:text-sm text-[#181c22] truncate">{rec.title || 'Untitled Recording'}</span>
                            <span className="text-[11px] font-mono text-[#777682] shrink-0">{formatDate(rec.createdAt)}</span>
                        </div>
                        <Pill tone={rec.status === 'transcribed' ? 'good' : rec.status === 'failed' ? 'bad' : 'default'}>{rec.status}</Pill>
                        {transcriptText && <p className="text-[12px] sm:text-[13px] text-[#464651] mt-2 line-clamp-2">{transcriptText}</p>}
                        {summaryText && <p className="text-[12px] sm:text-[13px] text-[#006e73] mt-1 line-clamp-2 italic">Summary: {summaryText}</p>}
                    </div>
                );
            })}
        </SectionCard>
    );
}

function ReportsTab({ data }) {
    if (!data || data.reports.length === 0) return <SectionCard title="Reports"><EmptyRow label="No reports generated yet." /></SectionCard>;
    return (
        <SectionCard title="Reports" count={data.total}>
            {data.reports.map((r) => (
                <div key={r._id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-bold text-[13px] sm:text-sm text-[#181c22] truncate">{r.title}</p>
                        <p className="text-[11px] text-[#777682] capitalize">{r.template} template</p>
                    </div>
                    <span className="text-[11px] font-mono text-[#777682] shrink-0">{formatDate(r.createdAt)}</span>
                </div>
            ))}
        </SectionCard>
    );
}

function NotesTab({ data }) {
    if (!data) return null;
    return (
        <>
            <SectionCard title="Projects" count={data.projects.length}>
                {data.projects.length === 0 ? <EmptyRow label="No projects yet." /> : data.projects.map((p) => (
                    <div key={p._id} className="px-4 sm:px-5 py-3">
                        <p className="font-bold text-[13px] sm:text-sm text-[#181c22]">{p.name}</p>
                        {p.description && <p className="text-[12px] text-[#777682] mt-0.5 line-clamp-1">{p.description}</p>}
                    </div>
                ))}
            </SectionCard>
            <SectionCard title="Notes" count={data.notes.length}>
                {data.notes.length === 0 ? <EmptyRow label="No notes yet." /> : data.notes.map((n) => (
                    <div key={n._id} className="px-4 sm:px-5 py-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-[13px] sm:text-sm text-[#181c22] truncate">{n.title}</p>
                            <span className="text-[11px] font-mono text-[#777682] shrink-0">{formatDate(n.createdAt)}</span>
                        </div>
                        {n.preview && <p className="text-[12px] text-[#464651] mt-1 line-clamp-2">{n.preview}</p>}
                    </div>
                ))}
            </SectionCard>
        </>
    );
}

function SeminarsTab({ data }) {
    if (!data) return null;
    return (
        <>
            <SectionCard title="Hosted Seminars" count={data.hosted.length}>
                {data.hosted.length === 0 ? <EmptyRow label="Hasn't hosted any seminars." /> : data.hosted.map((s) => (
                    <div key={s._id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="font-bold text-[13px] sm:text-sm text-[#181c22] truncate">{s.title}</p>
                            <p className="text-[11px] text-[#777682]">{s.location}</p>
                        </div>
                        <span className="text-[11px] font-mono text-[#777682] shrink-0">{formatDate(s.date)}</span>
                    </div>
                ))}
            </SectionCard>
            <SectionCard title="Registrations Attended" count={data.registrations.length}>
                {data.registrations.length === 0 ? <EmptyRow label="Hasn't registered for any seminars." /> : data.registrations.map((r) => (
                    <div key={r._id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="font-bold text-[13px] sm:text-sm text-[#181c22] truncate">{r.seminarId?.title || 'Deleted seminar'}</p>
                            <p className="text-[11px] text-[#777682]">Hosted by {r.seminarId?.hostName || 'Unknown'}</p>
                        </div>
                        {r.rewardClaimed && <Pill tone="good">+{r.rewardAmount} coins</Pill>}
                    </div>
                ))}
            </SectionCard>
        </>
    );
}

function CollaborationTab({ data }) {
    if (!data) return null;
    return (
        <>
            <SectionCard title="Collaboration Submissions" count={data.collaborationSubmissions.length}>
                {data.collaborationSubmissions.length === 0 ? <EmptyRow label="No collaboration submissions." /> : data.collaborationSubmissions.map((c) => (
                    <div key={c._id} className="px-4 sm:px-5 py-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-[13px] sm:text-sm text-[#181c22]">{c.researcherName}</p>
                            <Pill tone={c.status === 'submitted' ? 'good' : 'warn'}>{c.status}</Pill>
                        </div>
                        <p className="text-[12px] text-[#464651] mt-1 line-clamp-2">{c.summary}</p>
                    </div>
                ))}
            </SectionCard>
            <SectionCard title="Form Submissions" count={data.submissions.length}>
                {data.submissions.length === 0 ? <EmptyRow label="No form submissions." /> : data.submissions.map((s) => (
                    <div key={s._id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                        <p className="font-bold text-[13px] sm:text-sm text-[#181c22] truncate">{s.schemaId?.title || 'Deleted form'}</p>
                        <Pill tone={s.status === 'submitted' ? 'good' : 'warn'}>{s.status}</Pill>
                    </div>
                ))}
            </SectionCard>
        </>
    );
}

function CoinsTab({ data }) {
    if (!data) return null;
    return (
        <>
            <SectionCard title="Transaction Ledger" count={data.total}>
                {data.transactions.length === 0 ? <EmptyRow label="No coin transactions." /> : data.transactions.map((t) => (
                    <div key={t._id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="font-bold text-[13px] sm:text-sm text-[#181c22] truncate">{t.action}</p>
                            <p className="text-[11px] text-[#777682]">{formatDate(t.date || t.createdAt)}</p>
                        </div>
                        <span className={`font-mono font-bold text-[13px] shrink-0 ${t.amount >= 0 ? 'text-[#006e73]' : 'text-[#ba1a1a]'}`}>
                            {t.amount >= 0 ? '+' : ''}{t.amount}
                        </span>
                    </div>
                ))}
            </SectionCard>
            <SectionCard title="Referrals Given" count={data.referralsGiven.length}>
                {data.referralsGiven.length === 0 ? <EmptyRow label="Hasn't referred anyone yet." /> : data.referralsGiven.map((r) => (
                    <div key={r._id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="font-bold text-[13px] sm:text-sm text-[#181c22] truncate">{r.referredName} (L{r.level})</p>
                            <p className="text-[11px] text-[#777682]">{r.referredEmail}</p>
                        </div>
                        <Pill tone={r.approvalStatus === 'approved' ? 'good' : r.approvalStatus === 'rejected' ? 'bad' : 'warn'}>{r.approvalStatus}</Pill>
                    </div>
                ))}
            </SectionCard>
            <SectionCard title="Referred By" count={data.referralsReceived.length}>
                {data.referralsReceived.length === 0 ? <EmptyRow label="Not referred by anyone." /> : data.referralsReceived.map((r) => (
                    <div key={r._id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                        <p className="font-bold text-[13px] sm:text-sm text-[#181c22]">{r.beneficiaryId?.fullName || 'Unknown'} (L{r.level})</p>
                        <Pill tone={r.approvalStatus === 'approved' ? 'good' : r.approvalStatus === 'rejected' ? 'bad' : 'warn'}>{r.approvalStatus}</Pill>
                    </div>
                ))}
            </SectionCard>
        </>
    );
}

function TimelineTab({ data }) {
    if (!data || data.events.length === 0) return <SectionCard title="Timeline & Achievements"><EmptyRow label="No timeline events yet." /></SectionCard>;
    return (
        <SectionCard title="Timeline & Achievements" count={data.events.length}>
            {data.events.map((e) => (
                <div key={e._id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-bold text-[13px] sm:text-sm text-[#181c22]">{e.title}</p>
                        <p className="text-[12px] text-[#777682] line-clamp-1">{e.description}</p>
                    </div>
                    <span className="text-[11px] font-mono text-[#777682] shrink-0">{formatDate(e.createdAt)}</span>
                </div>
            ))}
        </SectionCard>
    );
}

function TicketsTab({ data }) {
    if (!data || data.tickets.length === 0) return <SectionCard title="Support Tickets"><EmptyRow label="No support tickets raised." /></SectionCard>;
    return (
        <SectionCard title="Support Tickets" count={data.tickets.length}>
            {data.tickets.map((t) => (
                <div key={t._id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-bold text-[13px] sm:text-sm text-[#181c22]">{t.category}</p>
                        <p className="text-[11px] text-[#777682]">{t.messages?.length || 0} messages · {formatDate(t.createdAt)}</p>
                    </div>
                    <Pill tone={t.status === 'open' ? 'warn' : 'good'}>{t.status}</Pill>
                </div>
            ))}
        </SectionCard>
    );
}
