import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import api from '../services/api';

export default function SupportSidebar({ isOpen, onClose }) {
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const accessToken = useSelector(state => state.auth?.accessToken);
    const currentUser = useSelector(state => state.auth?.user);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);

    // Fetch initial ticket
    useEffect(() => {
        if (!isOpen || !accessToken) return;
        
        setIsLoading(true);
        api.get('/support')
        .then(res => {
            const data = res.data;
            if (data.ticket) {
                setTicket(data.ticket);
                setMessages(data.ticket.messages || []);
            }
            setIsLoading(false);
        })
        .catch(err => {
            console.error('Support fetch error:', err);
            setIsLoading(false);
        });
    }, [isOpen, accessToken]);

    // Socket connection
    useEffect(() => {
        if (!accessToken || !isOpen) return;

        // Use standard WebSocket implementation without auth parameter since ThinkMic server.js does not parse handshake auth
        socketRef.current = io('http://localhost:5000');

        socketRef.current.on('new_support_message', (data) => {
            // Update messages if it's our ticket
            setMessages(prev => {
                const exists = prev.find(m => m._id === data.message._id);
                if (exists) return prev;
                return [...prev, data.message];
            });
        });

        // Join this user's room so admin replies pushed via io.to(userId) are received
        socketRef.current.emit('join', currentUser?.id);

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [accessToken, isOpen, currentUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !accessToken) return;

        const text = newMessage;
        setNewMessage(''); // optimistic clear

        try {
            const res = await api.post('/support', {
                text,
                ticketId: ticket?._id
            });
            const data = res.data;
            if (res.status === 200 || res.status === 201) {
                if (!ticket) setTicket(data.ticket);
                // We rely on the API response to append our own message immediately,
                // but Socket.io might also fire it back. The duplicate check handles it.
                setMessages(prev => {
                    const exists = prev.find(m => m._id === data.message._id);
                    if (exists) return prev;
                    return [...prev, data.message];
                });
            }
        } catch (error) {
            console.error("Failed to send message", error);
            setNewMessage(text); // restore on fail
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-[-5px_0_25px_rgba(0,0,0,0.1)] z-50 flex flex-col transform transition-transform duration-300">
            {/* Header */}
            <div className="h-16 bg-[#222777] flex items-center justify-between px-4 sm:px-6 shrink-0 text-white">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[24px]">support_agent</span>
                    <div>
                        <h2 className="font-bold text-[15px] sm:text-[16px]">Support Chat</h2>
                        <span className="text-[11px] sm:text-[12px] text-[#e6fbfc] flex items-center gap-1.5 opacity-90">
                            <span className="w-2 h-2 rounded-full bg-[#006e73] animate-pulse"></span> Online
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f9f9ff] flex flex-col gap-4">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <span className="material-symbols-outlined animate-spin text-[#c7c5d3] text-3xl">autorenew</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center my-auto flex flex-col items-center opacity-50">
                        <span className="material-symbols-outlined text-4xl mb-2 text-[#777682]">forum</span>
                        <p className="text-[13px] sm:text-[14px] font-bold text-[#464651]">No messages yet</p>
                        <p className="text-[11px] sm:text-[12px] text-[#777682] mt-1">Send a message to start a conversation with our team.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMine = msg.sender._id === currentUser?.id;
                        return (
                            <div key={msg._id || idx} className={`flex flex-col max-w-[85%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
                                <div className={`px-4 py-2.5 rounded-2xl text-[13px] sm:text-[14px] leading-relaxed shadow-sm ${
                                    isMine 
                                    ? 'bg-[#222777] text-white rounded-br-sm' 
                                    : 'bg-white border border-[#e0e2eb] text-[#181c22] rounded-bl-sm'
                                }`}>
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-[#777682] font-semibold mt-1 px-1">
                                    {isMine ? 'You' : msg.sender?.fullName || 'Support'} • {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 sm:p-5 bg-white border-t border-[#e0e2eb] shrink-0">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 bg-[#f9f9ff] border border-[#c7c5d3] rounded-full px-4 py-2.5 text-[13px] sm:text-[14px] focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] transition-shadow"
                    />
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim()}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#222777] text-white flex items-center justify-center disabled:opacity-50 hover:bg-[#3a3f8f] transition-colors shrink-0"
                    >
                        <span className="material-symbols-outlined text-[18px] sm:text-[20px] ml-0.5">send</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
