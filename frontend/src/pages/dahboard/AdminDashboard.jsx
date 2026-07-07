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
        <div className="w-full h-[calc(100vh-64px)] overflow-y-auto bg-[#f9f9ff] font-sans custom-scrollbar">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="flex flex-col gap-5 sm:gap-6 w-full p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto pb-12">

                {/* Time & User Filters */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 sm:gap-6">
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-2 items-start sm:items-center w-full xl:w-auto">
                        <div className="flex gap-2">
                            <button className="px-3 sm:px-4 py-1.5 rounded-md bg-[#eef0f9] text-[#464651] text-[12px] sm:text-[13px] font-bold hover:bg-[#e0e2eb] transition-colors">7D</button>
                            <button className="px-3 sm:px-4 py-1.5 rounded-md bg-[#eef0f9] text-[#464651] text-[12px] sm:text-[13px] font-bold hover:bg-[#e0e2eb] transition-colors">30D</button>
                            <button className="px-3 sm:px-4 py-1.5 rounded-md bg-[#eef0f9] text-[#464651] text-[12px] sm:text-[13px] font-bold hover:bg-[#e0e2eb] transition-colors">90D</button>
                        </div>
                        <div className="flex items-center shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-md overflow-hidden border border-[#c7c5d3] w-full sm:w-auto mt-1 sm:mt-0">
                            <div className="bg-[#222777] text-white px-3 sm:px-4 py-2 sm:py-1.5 text-[12px] sm:text-[13px] font-bold tracking-wide">Custom</div>
                            <div className="bg-white text-[#181c22] px-3 py-2 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-none">
                                <span className="font-mono text-[12px] sm:text-[13px] font-bold">2023-10-01</span>
                                <span className="text-[#c7c5d3]">-</span>
                                <span className="font-mono text-[12px] sm:text-[13px] font-bold">2023-10-31</span>
                                <span className="material-symbols-outlined text-[#777682] ml-auto sm:ml-1 cursor-pointer text-[16px]">calendar_today</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full xl:w-auto pt-2 xl:pt-0 border-t border-[#e0e2eb] xl:border-0">
                        <span className="text-[12px] sm:text-[13px] font-bold text-[#464651]">Filter by Users:</span>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                        <div className="flex justify-between items-center"><span className="text-[11px] sm:text-[13px] font-bold text-[#464651]">Submissions</span><span className="material-symbols-outlined text-[#c7c5d3] text-[16px] sm:text-[18px]">description</span></div>
                        <div className="flex items-end gap-1 sm:gap-2"><span className="text-2xl sm:text-3xl font-bold text-[#181c22]">1,492</span><span className="text-[11px] sm:text-[12px] font-bold text-[#00c2cb] mb-0.5 sm:mb-1">↑12%</span></div>
                        <div className="flex items-end gap-1 h-6 sm:h-8 mt-1 sm:mt-2"><div className="flex-1 bg-[#61f4fd] h-[20%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[30%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[45%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[35%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[80%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[100%] rounded-t-sm"></div></div>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                        <div className="flex justify-between items-center"><span className="text-[11px] sm:text-[13px] font-bold text-[#464651]">Recordings</span><span className="material-symbols-outlined text-[#c7c5d3] text-[16px] sm:text-[18px]">mic</span></div>
                        <div className="flex items-end gap-1 sm:gap-2"><span className="text-2xl sm:text-3xl font-bold text-[#181c22]">384</span><span className="text-[11px] sm:text-[12px] font-bold text-[#ba1a1a] mb-0.5 sm:mb-1">↓3%</span></div>
                        <div className="flex items-end gap-1 h-6 sm:h-8 mt-1 sm:mt-2"><div className="flex-1 bg-[#61f4fd] h-[100%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[70%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[85%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[50%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[30%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[40%] rounded-t-sm"></div></div>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                        <div className="flex justify-between items-center"><span className="text-[11px] sm:text-[13px] font-bold text-[#464651]">Reports</span><span className="material-symbols-outlined text-[#c7c5d3] text-[16px] sm:text-[18px]">analytics</span></div>
                        <div className="flex items-end gap-1 sm:gap-2"><span className="text-2xl sm:text-3xl font-bold text-[#181c22]">89</span><span className="text-[11px] sm:text-[12px] font-bold text-[#00c2cb] mb-0.5 sm:mb-1">↑24%</span></div>
                        <div className="flex items-end gap-1 h-6 sm:h-8 mt-1 sm:mt-2"><div className="flex-1 bg-[#61f4fd] h-[15%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[25%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[30%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[45%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[70%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[90%] rounded-t-sm"></div></div>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                        <div className="flex justify-between items-center"><span className="text-[11px] sm:text-[13px] font-bold text-[#464651]">Active Users</span><span className="material-symbols-outlined text-[#c7c5d3] text-[16px] sm:text-[18px]">group</span></div>
                        <div className="flex items-end gap-1 sm:gap-2"><span className="text-2xl sm:text-3xl font-bold text-[#181c22]">4,210</span><span className="text-[11px] sm:text-[12px] font-bold text-[#00c2cb] mb-0.5 sm:mb-1">↑8%</span></div>
                        <div className="flex items-end gap-1 h-6 sm:h-8 mt-1 sm:mt-2"><div className="flex-1 bg-[#61f4fd] h-[60%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[75%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[65%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[80%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[100%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[85%] rounded-t-sm"></div></div>
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 sm:col-span-3 lg:col-span-1">
                        <div className="flex justify-between items-center"><span className="text-[11px] sm:text-[13px] font-bold text-[#464651]">Searches Run</span><span className="material-symbols-outlined text-[#c7c5d3] text-[16px] sm:text-[18px]">search</span></div>
                        <div className="flex items-end gap-1 sm:gap-2"><span className="text-2xl sm:text-3xl font-bold text-[#181c22]">12.5k</span><span className="text-[11px] sm:text-[12px] font-bold text-[#c7c5d3] mb-0.5 sm:mb-1">—0%</span></div>
                        <div className="flex items-end gap-1 h-6 sm:h-8 mt-1 sm:mt-2"><div className="flex-1 bg-[#61f4fd] h-[30%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[25%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[40%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[35%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[20%] rounded-t-sm"></div><div className="flex-1 bg-[#61f4fd] h-[35%] rounded-t-sm"></div></div>
                    </div>
                </div>

                {/* 2-Column Main Chart Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] rounded-xl bg-white p-5 sm:p-6 flex flex-col h-64 sm:h-80">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-[16px] sm:text-lg font-bold text-[#181c22]">Submissions Trend</h3>
                            <button className="text-[#464651] hover:text-[#222777] text-[11px] sm:text-[13px] font-bold flex items-center gap-1 transition-colors">
                                Export CSV <span className="material-symbols-outlined text-[14px] sm:text-[16px]">download</span>
                            </button>
                        </div>
                        <div className="flex-1 relative border-l border-b border-[#e0e2eb] pb-5 sm:pb-6 pl-3 sm:pl-4 flex flex-col justify-between">
                            <div className="absolute left-[-20px] sm:left-[-24px] top-0 bottom-5 sm:bottom-6 flex flex-col justify-between text-[9px] sm:text-[10px] font-mono font-bold text-[#c7c5d3]">
                                <span>150</span><span>100</span><span>50</span><span>0</span>
                            </div>
                            <div className="absolute left-3 sm:left-4 right-0 bottom-[-20px] sm:bottom-[-24px] flex justify-between text-[9px] sm:text-[10px] font-mono font-bold text-[#c7c5d3]">
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

                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] rounded-xl bg-white p-5 sm:p-6 flex flex-col h-64 sm:h-80">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-[16px] sm:text-lg font-bold text-[#181c22]">Completion Rate</h3>
                            <button className="text-[#464651] hover:text-[#222777] text-[11px] sm:text-[13px] font-bold flex items-center gap-1 transition-colors">
                                Export CSV <span className="material-symbols-outlined text-[14px] sm:text-[16px]">download</span>
                            </button>
                        </div>
                        <div className="flex-1 relative border-l border-b border-[#e0e2eb] pb-5 sm:pb-6 pl-2 sm:pl-4 flex items-end justify-around gap-2 sm:gap-4 px-2 sm:px-4">
                            <div className="absolute left-2 sm:left-4 right-0 bottom-[-20px] sm:bottom-[-24px] flex justify-around text-[8px] sm:text-[10px] font-mono font-bold text-[#c7c5d3]">
                                <span className="truncate">Form A</span><span className="truncate">Form B</span><span className="truncate">Form C</span><span className="truncate">Form D</span><span className="truncate">Form E</span>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-[16px] sm:text-lg font-bold text-[#181c22]">Top Users</h3>
                            <button className="text-[#464651] hover:text-[#222777] text-[11px] sm:text-[13px] font-bold flex items-center gap-1 transition-colors">
                                Export CSV <span className="material-symbols-outlined text-[14px] sm:text-[16px]">download</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[300px]">
                                <thead>
                                <tr className="border-b border-[#e0e2eb] text-[#777682] text-[11px] sm:text-[12px] font-bold uppercase tracking-wider">
                                    <th className="pb-2 sm:pb-3 flex items-center gap-1 font-mono whitespace-nowrap">User <span className="material-symbols-outlined text-[14px]">unfold_more</span></th>
                                    <th className="pb-2 sm:pb-3 text-right font-mono whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1">Submissions <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {topUsers.map((user, idx) => (
                                    <tr key={user.id} className={idx !== topUsers.length - 1 ? "border-b border-[#f1f3fc]" : ""}>
                                        <td className="py-3 sm:py-4 flex items-center gap-2 sm:gap-3 whitespace-nowrap">
                                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${user.color} flex items-center justify-center text-white text-[10px] sm:text-[11px] font-bold shadow-sm`}>{user.initials}</div>
                                            <span className="font-semibold text-[#181c22] text-[13px] sm:text-[14px]">{user.name}</span>
                                        </td>
                                        <td className="py-3 sm:py-4 text-right">
                                            <span className="font-mono text-[13px] sm:text-[14px] font-bold text-[#464651]">{user.submissions}</span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-[16px] sm:text-lg font-bold text-[#181c22]">Per-field Completion</h3>
                            <button className="text-[#464651] hover:text-[#222777] text-[11px] sm:text-[13px] font-bold flex items-center gap-1 transition-colors">
                                Export CSV <span className="material-symbols-outlined text-[14px] sm:text-[16px]">download</span>
                            </button>
                        </div>
                        <div className="flex flex-col gap-4 sm:gap-6 mt-1 sm:mt-2">
                            {fieldCompletions.map((field, idx) => (
                                <div key={idx} className="flex flex-col gap-1.5 sm:gap-2">
                                    <div className="flex justify-between items-center text-[11px] sm:text-[12px] font-mono font-bold text-[#464651]">
                                        <span>{field.label}</span>
                                        <span>{field.percentage}%</span>
                                    </div>
                                    <div className="w-full h-1.5 sm:h-2 bg-[#e0e2eb] rounded-full overflow-hidden">
                                        <div className="h-full bg-[#61f4fd] rounded-full" style={{ width: `${field.percentage}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Activity Full Table */}
                <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] flex flex-col overflow-hidden mb-6">
                    <div className="p-4 sm:p-5 border-b border-[#e0e2eb] flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white gap-4 sm:gap-0">
                        <h3 className="text-[16px] sm:text-lg font-bold text-[#181c22]">Recent Activity Log</h3>
                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            <div className="relative flex items-center w-full sm:w-auto">
                                <span className="material-symbols-outlined absolute left-3 text-[#777682] text-[16px] sm:text-[18px]">search</span>
                                <input type="text" placeholder="Search rows..." className="pl-8 sm:pl-9 pr-4 py-2 bg-[#f9f9ff] border border-[#e0e2eb] rounded-md text-[12px] sm:text-[13px] font-mono text-[#464651] focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] w-full sm:w-64 placeholder:text-[#c7c5d3]"/>
                            </div>
                            <button className="w-9 h-9 flex items-center justify-center border border-[#e0e2eb] rounded-md text-[#464651] hover:bg-[#f1f3fc] transition-colors shrink-0">
                                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">filter_list</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                            <tr className="bg-[#f9f9ff] border-b border-[#e0e2eb] text-[#777682] font-bold text-[11px] sm:text-[12px] uppercase tracking-wider">
                                <th className="p-3 sm:p-4 pl-4 sm:pl-6 font-mono w-1/4 whitespace-nowrap">User</th>
                                <th className="p-3 sm:p-4 font-mono w-1/4 whitespace-nowrap">Form</th>
                                <th className="p-3 sm:p-4 font-mono w-1/5 whitespace-nowrap">Submitted At</th>
                                <th className="p-3 sm:p-4 font-mono w-1/6 whitespace-nowrap">Status</th>
                                <th className="p-3 sm:p-4 pr-4 sm:pr-6 font-mono text-right whitespace-nowrap">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="text-[13px] sm:text-[14px]">
                            {recentActivityTable.map((activity) => (
                                <tr key={activity.id} className="border-b border-[#e0e2eb] hover:bg-[#f1f3fc] transition-colors">
                                    <td className="p-3 sm:p-4 pl-4 sm:pl-6 flex items-center gap-2 sm:gap-3">
                                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${activity.color} flex items-center justify-center text-white text-[10px] sm:text-[11px] font-bold shadow-sm shrink-0`}>{activity.initials}</div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-[#181c22] truncate">{activity.user}</span>
                                            <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#777682] truncate">{activity.email}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 sm:p-4 text-[#464651] font-semibold whitespace-nowrap">{activity.form}</td>
                                    <td className="p-3 sm:p-4 font-mono text-[11px] sm:text-[12px] font-bold text-[#777682] whitespace-nowrap">{activity.submittedAt}</td>
                                    <td className="p-3 sm:p-4 whitespace-nowrap">
                                            <span className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 w-fit border
                                                ${activity.status === 'Submitted' ? 'bg-[#e6fbfc] text-[#006e73] border-[#b2f0f4]' : ''}
                                                ${activity.status === 'Draft' ? 'bg-[#fff8e1] text-[#b45309] border-[#ffe082]' : ''}
                                                ${activity.status === 'Overdue' ? 'bg-[#ffdad6] text-[#ba1a1a] border-[#ffb4ab]' : ''}
                                            `}>
                                                <span className="material-symbols-outlined text-[12px] sm:text-[14px]">
                                                    {activity.status === 'Submitted' && 'check_circle'}
                                                    {activity.status === 'Draft' && 'draft'}
                                                    {activity.status === 'Overdue' && 'error'}
                                                </span>
                                                {activity.status}
                                            </span>
                                    </td>
                                    <td className="p-3 sm:p-4 pr-4 sm:pr-6 text-right">
                                        <button className="text-[#c7c5d3] hover:text-[#222777] transition-colors p-1"><span className="material-symbols-outlined text-[18px] sm:text-[20px]">more_vert</span></button>
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