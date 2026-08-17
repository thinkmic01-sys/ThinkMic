import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { API_BASE_URL } from '../../config';

export default function SupportInbox() {
    const accessToken = useSelector(state => state.auth?.accessToken);
    const currentUser = useSelector(state => state.auth?.user);
    const [tickets, setTickets] = useState([]);
    const [activeTicket, setActiveTicket] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);

    // Fetch tickets
    const fetchTickets = () => {
        if (!accessToken) return;
        setIsLoading(true);
        api.get('/support/all')
        .then(res => {
            const data = res.data;
            if (data.tickets) {
                setTickets(data.tickets);
            }
            setIsLoading(false);
        })
        .catch(err => {
            console.error('Failed to fetch tickets', err);
            setIsLoading(false);
        });
    };

    useEffect(() => {
        fetchTickets();
    }, [accessToken]);

    // Socket
    useEffect(() => {
        if (!accessToken) return;
        socketRef.current = io(API_BASE_URL, { withCredentials: true });
        
        socketRef.current.on('new_support_message', (data) => {
            setTickets(prev => {
                const updated = prev.map(t => {
                    if (t._id === data.ticketId) {
                        const exists = t.messages.find(m => m._id === data.message._id);
                        if (exists) return t;
                        return { ...t, messages: [...t.messages, data.message], updatedAt: new Date().toISOString() };
                    }
                    return t;
                });
                
                // If it's a completely new ticket not in our list, we might want to re-fetch
                // For simplicity, just sort updated array
                return updated.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            });
            
            setActiveTicket(prev => {
                if (prev && prev._id === data.ticketId) {
                    const exists = prev.messages.find(m => m._id === data.message._id);
                    if (exists) return prev;
                    return { ...prev, messages: [...prev.messages, data.message] };
                }
                return prev;
            });
        });

        // Admin room - lets io.to('admin_support') pushes (new user messages) reach this inbox
        socketRef.current.emit('join', 'admin_support');
        if (currentUser) socketRef.current.emit('join', currentUser.id);

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [accessToken, currentUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeTicket?.messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeTicket) return;

        const text = newMessage;
        setNewMessage('');

        try {
            const res = await api.post('/support', { text, ticketId: activeTicket._id });
            const data = res.data;
            if (res.status >= 200 && res.status < 300) {
                // Update active ticket immediately
                setActiveTicket(prev => {
                    if (!prev || prev._id !== activeTicket._id) return prev;
                    const exists = prev.messages.find(m => m._id === data.message._id);
                    if (exists) return prev;
                    return { ...prev, messages: [...prev.messages, data.message] };
                });
            }
        } catch (err) {
            console.error(err);
            setNewMessage(text);
        }
    };

    const handleCloseTicket = async () => {
        if (!activeTicket) return;
        try {
            const res = await api.patch(`/support/${activeTicket._id}/close`);
            if (res.status >= 200 && res.status < 300) {
                setActiveTicket(null);
                fetchTickets(); // Refresh list
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 w-full font-sans h-[calc(100vh-64px)] flex flex-col">
            <div className="mb-6 shrink-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#075e51] tracking-tight">Support Inbox</h1>
                <p className="text-[13px] sm:text-sm font-semibold text-[#777682] mt-1">Manage user support requests.</p>
            </div>

            <div className="flex-1 bg-white border border-[#e0e2eb] rounded-lg shadow-sm flex overflow-hidden min-h-0">
                {/* Ticket List */}
                <div className="w-1/3 border-r border-[#e0e2eb] flex flex-col bg-[#F4F9F8]">
                    <div className="p-4 border-b border-[#e0e2eb] font-bold text-[#464651] uppercase tracking-wider text-[12px]">
                        Active Tickets
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-[#777682]">Loading...</div>
                        ) : tickets.length === 0 ? (
                            <div className="p-4 text-center text-[#777682] text-[13px]">No tickets found.</div>
                        ) : (
                            tickets.map(t => (
                                <button 
                                    key={t._id}
                                    onClick={() => setActiveTicket(t)}
                                    className={`w-full text-left p-4 border-b border-[#e0e2eb] hover:bg-white transition-colors ${activeTicket?._id === t._id ? 'bg-white border-l-4 border-l-[#075e51]' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-[#181c22] text-[14px] truncate pr-2">{t.user?.fullName || 'Unknown User'}</span>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${t.status === 'open' ? 'bg-[#FEF9C3] text-[#006e73]' : 'bg-[#e0e2eb] text-[#464651]'}`}>
                                            {t.status}
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-[#777682] truncate">
                                        {t.messages[t.messages.length - 1]?.text || 'No messages'}
                                    </p>
                                    <p className="text-[10px] text-[#c7c5d3] mt-2 font-mono">
                                        {new Date(t.updatedAt).toLocaleString()}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Pane */}
                <div className="flex-1 flex flex-col bg-white">
                    {activeTicket ? (
                        <>
                            <div className="h-14 border-b border-[#e0e2eb] flex items-center justify-between px-6 shrink-0 bg-[#F4F9F8]">
                                <h3 className="font-bold text-[#075e51]">Chatting with {activeTicket.user?.fullName}</h3>
                                {activeTicket.status === 'open' && (
                                    <button onClick={handleCloseTicket} className="text-[12px] font-bold text-[#ba1a1a] hover:bg-[#ba1a1a]/10 px-3 py-1.5 rounded transition-colors">
                                        Close Ticket
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                                {activeTicket.messages.map((msg, idx) => {
                                    const isMine = !msg.isBot && msg.sender?._id === currentUser?.id;
                                    return (
                                        <div key={msg._id || idx} className={`flex flex-col max-w-[70%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
                                            <div className={`px-4 py-2.5 rounded-2xl text-[13px] sm:text-[14px] leading-relaxed shadow-sm ${
                                                isMine
                                                ? 'bg-[#075e51] text-white rounded-br-sm'
                                                : msg.isBot
                                                ? 'bg-[#FEF9C3] border border-[#EAB308]/30 text-[#181c22] rounded-bl-sm'
                                                : 'bg-[#F4F9F8] border border-[#e0e2eb] text-[#181c22] rounded-bl-sm'
                                            }`}>
                                                {msg.text}
                                            </div>
                                            <span className="text-[10px] text-[#777682] font-semibold mt-1 px-1">
                                                {isMine ? 'You' : msg.isBot ? 'ThinkMic AI' : (msg.sender?.fullName || 'User')} • {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {activeTicket.status === 'open' ? (
                                <form onSubmit={handleSendMessage} className="p-4 border-t border-[#e0e2eb] bg-[#F4F9F8] shrink-0">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Type reply..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            className="flex-1 border border-[#c7c5d3] rounded-md px-4 py-2 text-[14px] focus:outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]"
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={!newMessage.trim()}
                                            className="bg-[#075e51] text-white px-6 rounded-md font-bold text-[14px] disabled:opacity-50 hover:bg-[#097969] transition-colors"
                                        >
                                            Send
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="p-4 border-t border-[#e0e2eb] bg-[#F4F9F8] shrink-0 text-center text-[#777682] text-[13px] font-bold">
                                    This ticket is closed.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="m-auto text-[#c7c5d3] flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl">inbox</span>
                            <p className="font-bold text-[14px]">Select a ticket to view</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
