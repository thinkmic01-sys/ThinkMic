// frontend/src/pages/AdminDashboard.jsx
import React from 'react';

export default function AdminDashboard() {
    const topUsers = [
        { id: 1, name: "Dr. Alan Grant", submissions: 142, initials: "AG", color: "bg-[#222777]" },
        { id: 2, name: "Ellie Sattler", submissions: 118, initials: "ES", color: "bg-[#3a3f8f]" },
        { id: 3, name: "Ian Malcolm", submissions: 95, initials: "IM", color: "bg-[#5156a7]" },
        { id: 4, name: "John Hammond", submissions: 74, initials: "JH", color: "bg-[#181c22]" }
    ];

    const fieldCompletions = [
        { label: "Methodology Text", percentage: 98 },
        { label: "Data Set Attachment", percentage: 85 },
        { label: "Hypothesis Summary", percentage: 72 },
        { label: "Peer Review Notes", percentage: 45 }
    ];

    const recentActivityTable = [
        { id: 1, user: "Dr. Alan Grant", email: "grant.a@thinkmic.edu", form: "Paleontology Field Report V2", submittedAt: "2023-10-31 14:22:05", status: "Submitted", initials: "AG", color: "bg-[#222777]" },
        { id: 2, user: "Ellie Sattler", email: "sattler.e@thinkmic.edu", form: "Botany Specimen Analysis", submittedAt: "2023-10-31 11:05:12", status: "Draft", initials: "ES", color: "bg-[#3a3f8f]" },
        { id: 3, user: "Ian Malcolm", email: "malcolm.i@thinkmic.edu", form: "Chaos Theory Modeling", submittedAt: "2023-10-29 09:15:00", status: "Overdue", initials: "IM", color: "bg-[#5156a7]" }
    ];

    return (
        <div className="h-[calc(100vh-64px)] overflow-y-auto bg-[#f9f9ff] w-full relative">
            <div className="flex flex-col gap-6 w-full p-6 md:p-8 max-w-[1600px] mx-auto pb-12">

                {/* Time & User Filters */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-wrap gap-2 items-center">
                        <button className="px-4 py-1.5 rounded-md bg-[#eef0f9] text-[#464651] text-[13px] font-bold hover:bg-[#e0e2eb] transition-colors">7D</button>
                        <button className="px-4 py-1.5 rounded-md bg-[#eef0f9] text-[#464651] text-[13px] font-bold hover:bg-[#e0e2eb] transition-colors">30D</button>
                        <button className="px-4 py-1.5 rounded-md bg-[#eef0f9] text-[#464651] text-[13px] font-bold hover:bg-[#e0e2eb] transition-colors">90D</button>
                        <div className="flex items-center ml-2 shadow-sm rounded-md overflow-hidden border border-[#c7c5d3]">
                            <div className="bg-[#222777] text-white px-4 py-1.5 text-[13px] font-bold tracking-wide">Custom</div>
                            <div className="bg-white text-[#181c22] px-3 py-1.5 flex items-center gap-2">
                                <span className="font-mono text-[13px] font-bold">2023-10-01</span>
                                <span className="text-[#c7c5d3]">-</span>
                                <span className="font-mono text-[13px] font-bold">2023-10-31</span>
                                <span className="material-symbols-outlined text-[#777682] ml-1 cursor-pointer text-[16px]">calendar_today</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-[#464651]">Filter by Users:</span>
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-[#222777] border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-sm z-30">AG</div>
                            <div className="w-8 h-8 rounded-full bg-[#3a3f8f] border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-sm -ml-2 z-20">ES</div>
                            <div className="w-8 h-8 rounded-full bg-[#5156a7] border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-sm -ml-2 z-10">IM</div>
                            <button className="w-8 h-8 rounded-full bg-[#f1f3fc] border-2 border-white flex items-center justify-center text-[#464651] hover:bg-[#e0e2eb] transition-colors shadow-sm -ml-2 z-0">
                                <span className="material-symbols-outlined text-[16px]">add</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards (5 Columns) */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-center"><span className="text-[13px] font-bold text-[#464651]">Submissions</span><span className="material-symbols-outlined text-[#c7c5d3] text-[18px]">description</span></div>
                        <div className="flex items-end gap-2"><span className="text-3xl font-bold text-[#181c22]">1,492</span><span className="text-[12px] font-bold text-[#00c2cb] mb-1">↑12%</span></div>
                        <div className="flex items-end gap-1 h-8 mt-2"><div className="flex-1 bg-[#61f4fd] h-[20%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[30%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[45%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[35%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[80%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[100%] rounded-t-sm"></div></div>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-center"><span className="text-[13px] font-bold text-[#464651]">Recordings</span><span className="material-symbols-outlined text-[#c7c5d3] text-[18px]">mic</span></div>
                        <div className="flex items-end gap-2"><span className="text-3xl font-bold text-[#181c22]">384</span><span className="text-[12px] font-bold text-[#ba1a1a] mb-1">↓3%</span></div>
                        <div className="flex items-end gap-1 h-8 mt-2"><div className="flex-1 bg-[#61f4fd] h-[100%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[70%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[85%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[50%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[30%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[40%] rounded-t-sm"></div></div>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-center"><span className="text-[13px] font-bold text-[#464651]">Reports</span><span className="material-symbols-outlined text-[#c7c5d3] text-[18px]">analytics</span></div>
                        <div className="flex items-end gap-2"><span className="text-3xl font-bold text-[#181c22]">89</span><span className="text-[12px] font-bold text-[#00c2cb] mb-1">↑24%</span></div>
                        <div className="flex items-end gap-1 h-8 mt-2"><div className="flex-1 bg-[#61f4fd] h-[15%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[25%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[30%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[45%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[70%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[90%] rounded-t-sm"></div></div>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-center"><span className="text-[13px] font-bold text-[#464651]">Active Users</span><span className="material-symbols-outlined text-[#c7c5d3] text-[18px]">group</span></div>
                        <div className="flex items-end gap-2"><span className="text-3xl font-bold text-[#181c22]">4,210</span><span className="text-[12px] font-bold text-[#00c2cb] mb-1">↑8%</span></div>
                        <div className="flex items-end gap-1 h-8 mt-2"><div className="flex-1 bg-[#61f4fd] h-[60%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[75%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[65%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[80%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[100%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[85%] rounded-t-sm"></div></div>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-center"><span className="text-[13px] font-bold text-[#464651]">Searches Run</span><span className="material-symbols-outlined text-[#c7c5d3] text-[18px]">search</span></div>
                        <div className="flex items-end gap-2"><span className="text-3xl font-bold text-[#181c22]">12.5k</span><span className="text-[12px] font-bold text-[#c7c5d3] mb-1">—0%</span></div>
                        <div className="flex items-end gap-1 h-8 mt-2"><div className="flex-1 bg-[#61f4fd] h-[30%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[25%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[40%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[35%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[20%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[35%] rounded-t-sm"></div></div>
                    </div>
                </div>

                {/* 2-Column Main Chart Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] rounded-xl bg-white p-6 flex flex-col h-80">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-[#181c22]">Submissions Trend</h3>
                            <button className="text-[#464651] hover:text-[#222777] text-[13px] font-bold flex items-center gap-1 transition-colors">
                                Export CSV <span className="material-symbols-outlined text-[16px]">download</span>
                            </button>
                        </div>
                        <div className="flex-1 relative border-l border-b border-[#e0e2eb] pb-6 pl-4 flex flex-col justify-between">
                            <div className="absolute left-[-24px] top-0 bottom-6 flex flex-col justify-between text-[10px] font-mono font-bold text-[#c7c5d3]">
                                <span>150</span><span>100</span><span>50</span><span>0</span>
                            </div>
                            <div className="absolute left-4 right-0 bottom-[-24px] flex justify-between text-[10px] font-mono font-bold text-[#c7c5d3]">
                                <span>Oct 1</span><span>Oct 8</span><span>Oct 15</span><span>Oct 22</span><span>Oct 31</span>
                            </div>
                            <div className="absolute inset-0 top-2 bottom-0 left-0 right-0 overflow-hidden flex items-end">
                                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                    <defs>
                                        <linearGradient id="areaGradient2" x1="0%" x2="0%" y1="0%" y2="100%">
                                            <stop offset="0%" stopColor="#61f4fd" stopOpacity="0.4"></stop>
                                            <stop offset="100%" stopColor="#61f4fd" stopOpacity="0"></stop>
                                        </linearGradient>
                                    </defs>
                                    <path d="M0,80 C20,50 40,30 50,40 C60,50 70,70 80,20 C90,-10 100,20 100,20 L100,100 L0,100 Z" fill="url(#areaGradient2)"></path>
                                    <path d="M0,80 C20,50 40,30 50,40 C60,50 70,70 80,20 C90,-10 100,20 100,20" fill="none" stroke="#222777" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] rounded-xl bg-white p-6 flex flex-col h-80">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-[#181c22]">Completion Rate</h3>
                            <button className="text-[#464651] hover:text-[#222777] text-[13px] font-bold flex items-center gap-1 transition-colors">
                                Export CSV <span className="material-symbols-outlined text-[16px]">download</span>
                            </button>
                        </div>
                        <div className="flex-1 relative border-l border-b border-[#e0e2eb] pb-6 pl-4 flex items-end justify-around gap-4 px-4">
                            <div className="absolute left-4 right-0 bottom-[-24px] flex justify-around text-[10px] font-mono font-bold text-[#c7c5d3]">
                                <span>Form A</span><span>Form B</span><span>Form C</span><span>Form D</span><span>Form E</span>
                            </div>
                            <div className="w-full bg-[#3a3f8f] hover:bg-[#5156a7] transition-colors rounded-t-sm h-[70%]"></div>
                            <div className="w-full bg-[#3a3f8f] hover:bg-[#5156a7] transition-colors rounded-t-sm h-[55%]"></div>
                            <div className="w-full bg-[#3a3f8f] hover:bg-[#5156a7] transition-colors rounded-t-sm h-[85%]"></div>
                            <div className="w-full bg-[#3a3f8f] hover:bg-[#5156a7] transition-colors rounded-t-sm h-[40%]"></div>
                            <div className="w-full bg-[#3a3f8f] hover:bg-[#5156a7] transition-colors rounded-t-sm h-[65%]"></div>
                        </div>
                    </div>
                </div>

                {/* Top Users & Per-field Completion Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-[#181c22]">Top Users</h3>
                            <button className="text-[#464651] hover:text-[#222777] text-[13px] font-bold flex items-center gap-1 transition-colors">
                                Export CSV <span className="material-symbols-outlined text-[16px]">download</span>
                            </button>
                        </div>
                        <div className="flex-1">
                            <table className="w-full text-left">
                                <thead>
                                <tr className="border-b border-[#e0e2eb] text-[#777682] text-[12px] font-bold uppercase tracking-wider">
                                    <th className="pb-3 flex items-center gap-1 font-mono">User <span className="material-symbols-outlined text-[14px]">unfold_more</span></th>
                                    <th className="pb-3 text-right font-mono">
                                        <div className="flex items-center justify-end gap-1">Submissions <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {topUsers.map((user, idx) => (
                                    <tr key={user.id} className={idx !== topUsers.length - 1 ? "border-b border-[#f1f3fc]" : ""}>
                                        <td className="py-4 flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-white text-[11px] font-bold shadow-sm`}>{user.initials}</div>
                                            <span className="font-semibold text-[#181c22] text-[14px]">{user.name}</span>
                                        </td>
                                        <td className="py-4 text-right">
                                            <span className="font-mono text-[14px] font-bold text-[#464651]">{user.submissions}</span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-[#181c22]">Per-field Completion</h3>
                            <button className="text-[#464651] hover:text-[#222777] text-[13px] font-bold flex items-center gap-1 transition-colors">
                                Export CSV <span className="material-symbols-outlined text-[16px]">download</span>
                            </button>
                        </div>
                        <div className="flex flex-col gap-6 mt-2">
                            {fieldCompletions.map((field, idx) => (
                                <div key={idx} className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-[12px] font-mono font-bold text-[#464651]">
                                        <span>{field.label}</span>
                                        <span>{field.percentage}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-[#e0e2eb] rounded-full overflow-hidden">
                                        <div className="h-full bg-[#61f4fd] rounded-full" style={{ width: `${field.percentage}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Activity Full Table */}
                <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] flex flex-col overflow-hidden mb-6">
                    <div className="p-5 border-b border-[#e0e2eb] flex justify-between items-center bg-white">
                        <h3 className="text-lg font-bold text-[#181c22]">Recent Activity Log</h3>
                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center">
                                <span className="material-symbols-outlined absolute left-3 text-[#777682] text-[18px]">search</span>
                                <input type="text" placeholder="Search rows..." className="pl-9 pr-4 py-2 bg-[#f9f9ff] border border-[#e0e2eb] rounded-md text-[13px] font-mono text-[#464651] focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] w-64 placeholder:text-[#c7c5d3]"/>
                            </div>
                            <button className="w-9 h-9 flex items-center justify-center border border-[#e0e2eb] rounded-md text-[#464651] hover:bg-[#f1f3fc] transition-colors">
                                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-[#f9f9ff] border-b border-[#e0e2eb] text-[#777682] font-bold text-[12px] uppercase tracking-wider">
                                <th className="p-4 pl-6 font-mono w-1/4">User</th>
                                <th className="p-4 font-mono w-1/4">Form</th>
                                <th className="p-4 font-mono w-1/5">Submitted At</th>
                                <th className="p-4 font-mono w-1/6">Status</th>
                                <th className="p-4 pr-6 font-mono text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="text-[14px]">
                            {recentActivityTable.map((activity) => (
                                <tr key={activity.id} className="border-b border-[#e0e2eb] hover:bg-[#f1f3fc] transition-colors">
                                    <td className="p-4 pl-6 flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full ${activity.color} flex items-center justify-center text-white text-[11px] font-bold shadow-sm shrink-0`}>{activity.initials}</div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[#181c22]">{activity.user}</span>
                                            <span className="font-mono text-[11px] font-bold text-[#777682]">{activity.email}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-[#464651] font-semibold">{activity.form}</td>
                                    <td className="p-4 font-mono text-[12px] font-bold text-[#777682]">{activity.submittedAt}</td>
                                    <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 w-fit border
                                                ${activity.status === 'Submitted' ? 'bg-[#e6fbfc] text-[#006e73] border-[#b2f0f4]' : ''}
                                                ${activity.status === 'Draft' ? 'bg-[#fff8e1] text-[#b45309] border-[#ffe082]' : ''}
                                                ${activity.status === 'Overdue' ? 'bg-[#ffdad6] text-[#ba1a1a] border-[#ffb4ab]' : ''}
                                            `}>
                                                <span className="material-symbols-outlined text-[14px]">
                                                    {activity.status === 'Submitted' && 'check_circle'}
                                                    {activity.status === 'Draft' && 'draft'}
                                                    {activity.status === 'Overdue' && 'error'}
                                                </span>
                                                {activity.status}
                                            </span>
                                    </td>
                                    <td className="p-4 pr-6 text-right">
                                        <button className="text-[#c7c5d3] hover:text-[#222777] transition-colors"><span className="material-symbols-outlined text-[20px]">more_vert</span></button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}