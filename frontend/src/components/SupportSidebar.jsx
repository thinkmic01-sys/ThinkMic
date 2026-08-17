import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import api from '../services/api';
import { API_BASE_URL } from '../config';
import { faqs } from '../pages/Support/Support';

const QUICK_TOPICS = [
    { emoji: '🎙️', label: 'Recording & Audio', message: "I'm having trouble with audio recording or transcription", category: 'Audio' },
    { emoji: '💰', label: 'Coins & Referral', message: 'Questions about my coin balance or referral payout', category: 'Coins' },
    { emoji: '📊', label: 'AI Reports', message: 'Need help synthesizing or customizing my AI report', category: 'Reports' },
    { emoji: '🎓', label: 'Seminars & Courses', message: 'Assistance with upcoming seminar registrations', category: 'Seminars' },
    { emoji: '⚙️', label: 'Account & Login', message: 'Account settings or password help', category: 'Account' }
];

// Renders plain URLs inside a message as clickable links without a stateful regex (avoids g-flag lastIndex bugs)
function linkify(text) {
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all">{part}</a>
        ) : (
            <span key={i}>{part}</span>
        )
    );
}

export default function SupportSidebar({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('chat');
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const [helpSearch, setHelpSearch] = useState('');
    const [openFaqIndex, setOpenFaqIndex] = useState(null);

    const [ratingValue, setRatingValue] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    const accessToken = useSelector(state => state.auth?.accessToken);
    const currentUser = useSelector(state => state.auth?.user);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const socketRef = useRef(null);

    // Fetch the latest ticket every time the sidebar opens
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

    // Socket connection - re-joins the user's room on every (re)connect so replies keep arriving after a drop
    useEffect(() => {
        if (!accessToken || !isOpen) return;

        socketRef.current = io(API_BASE_URL, { withCredentials: true });

        socketRef.current.on('new_support_message', (data) => {
            setMessages(prev => {
                const exists = prev.find(m => m._id === data.message._id);
                if (exists) return prev;
                return [...prev, data.message];
            });
        });

        const joinRoom = () => socketRef.current.emit('join', currentUser?.id);
        joinRoom();
        socketRef.current.on('connect', joinRoom);

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [accessToken, isOpen, currentUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    // Auto-grow the composer textarea as the user types
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 112) + 'px';
        }
    }, [newMessage]);

    const handleSendMessage = async (e, overrideText, overrideCategory) => {
        if (e && e.preventDefault) e.preventDefault();
        const text = (overrideText ?? newMessage).trim();
        if (!text || !accessToken || isSending) return;

        if (!overrideText) setNewMessage('');
        setIsSending(true);
        try {
            const res = await api.post('/support', {
                text,
                ticketId: ticket?._id,
                ...(overrideCategory ? { category: overrideCategory } : {})
            });
            const data = res.data;
            if (!ticket) setTicket(data.ticket);
            setMessages(prev => {
                const exists = prev.find(m => m._id === data.message._id);
                if (exists) return prev;
                return [...prev, data.message];
            });
        } catch (error) {
            console.error('Failed to send message', error);
            if (!overrideText) setNewMessage(text);
        } finally {
            setIsSending(false);
        }
    };

    const handleComposerKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleCloseTicket = async () => {
        if (!ticket || isClosing) return;
        setIsClosing(true);
        try {
            const res = await api.patch(`/support/${ticket._id}/close`);
            setTicket(res.data.ticket);
        } catch (error) {
            console.error('Failed to close ticket', error);
        } finally {
            setIsClosing(false);
        }
    };

    const handleSubmitRating = async () => {
        if (ratingValue === 0 || !ticket || isSubmittingRating) return;
        setIsSubmittingRating(true);
        try {
            const res = await api.patch(`/support/${ticket._id}/rate`, {
                rating: ratingValue,
                feedback: feedbackText.trim()
            });
            setTicket(res.data.ticket);
        } catch (error) {
            console.error('Failed to submit rating', error);
        } finally {
            setIsSubmittingRating(false);
        }
    };

    const handleStartNewConversation = () => {
        setTicket(null);
        setMessages([]);
        setNewMessage('');
        setRatingValue(0);
        setHoverRating(0);
        setFeedbackText('');
    };

    if (!isOpen) return null;

    const isTicketOpen = !ticket || ticket.status === 'open';
    const filteredFaqs = faqs.filter(f =>
        f.question.toLowerCase().includes(helpSearch.toLowerCase()) ||
        f.answer.toLowerCase().includes(helpSearch.toLowerCase())
    );

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-[-5px_0_25px_rgba(0,0,0,0.1)] z-50 flex flex-col transform transition-transform duration-300">
            {/* Header */}
            <div className="bg-[#075e51] shrink-0 text-white">
                <div className="h-16 flex items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                            <span className="material-symbols-outlined text-[24px]">support_agent</span>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#EAB308] border-2 border-[#075e51] animate-pulse"></span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-bold text-[15px] sm:text-[16px] truncate">Support Chat</h2>
                            <span className="text-[10px] sm:text-[11px] text-[#FEF9C3] opacity-90 truncate block">🟢 Online • Typically replies in minutes</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {ticket && (
                            <>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${ticket.status === 'open' ? 'bg-[#EAB308]/20 text-white' : 'bg-white/15 text-white/80'}`}>
                                    {ticket.status === 'open' ? 'Open' : 'Resolved'}
                                </span>
                                {ticket.status === 'open' && (
                                    <button onClick={handleCloseTicket} disabled={isClosing} title="Resolve Issue" className="p-1.5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50">
                                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                    </button>
                                )}
                            </>
                        )}
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-t border-white/10">
                    {[{ id: 'chat', label: 'Live Chat', icon: 'forum' }, { id: 'help', label: 'Instant Help', icon: 'help_outline' }].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-bold transition-colors border-b-2 ${
                                activeTab === tab.id ? 'text-white border-[#EAB308]' : 'text-white/50 border-transparent hover:text-white/80'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'chat' ? (
                <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F4F9F8] flex flex-col gap-4">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <span className="material-symbols-outlined animate-spin text-[#c7c5d3] text-3xl">autorenew</span>
                            </div>
                        ) : (
                            <>
                                {messages.length === 0 && isTicketOpen ? (
                                    <div className="text-center my-auto flex flex-col items-center gap-4 w-full">
                                        <span className="material-symbols-outlined text-4xl text-[#075e51]">forum</span>
                                        <div>
                                            <p className="text-[14px] font-bold text-[#181c22]">👋 Welcome! How can we help?</p>
                                            <p className="text-[11px] sm:text-[12px] text-[#777682] mt-1">Pick a topic below or type your own message.</p>
                                        </div>
                                        <div className="flex flex-col gap-2 w-full">
                                            {QUICK_TOPICS.map(topic => (
                                                <button
                                                    key={topic.category}
                                                    onClick={() => handleSendMessage(null, topic.message, topic.category)}
                                                    disabled={isSending}
                                                    className="w-full text-left bg-white border border-[#e0e2eb] rounded-lg px-3 py-2.5 text-[12px] font-semibold text-[#181c22] hover:border-[#EAB308] hover:bg-[#FEF9C3]/30 transition-colors flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <span>{topic.emoji}</span> {topic.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isMine = !msg.isBot && msg.sender?._id === currentUser?.id;
                                        const staffRole = !isMine && msg.sender?.role === 'manager' ? 'Manager' : (!isMine && msg.sender?.role === 'admin' ? 'Staff' : null);
                                        return (
                                            <div key={msg._id || idx} className={`flex flex-col max-w-[85%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
                                                {!isMine && (
                                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                                        <div className="w-5 h-5 rounded-full bg-[#eef0f9] overflow-hidden shrink-0 flex items-center justify-center">
                                                            {msg.isBot ? (
                                                                <span className="material-symbols-outlined text-[12px] text-[#EAB308]">smart_toy</span>
                                                            ) : msg.sender?.avatarUrl ? (
                                                                <img src={msg.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="material-symbols-outlined text-[12px] text-[#075e51]">support_agent</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-[#464651]">{msg.isBot ? 'ThinkMic AI' : (msg.sender?.fullName || 'Support')}</span>
                                                        {msg.isBot && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF9C3] text-[#006e73]">AI · Instant</span>}
                                                        {staffRole && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#eef0f9] text-[#075e51]">{staffRole}</span>}
                                                    </div>
                                                )}
                                                <div className={`px-4 py-2.5 rounded-2xl text-[13px] sm:text-[14px] leading-relaxed shadow-sm break-words overflow-hidden ${
                                                    isMine
                                                        ? 'bg-[#075e51] text-white rounded-br-sm'
                                                        : 'bg-white border border-[#e0e2eb] text-[#181c22] rounded-bl-sm'
                                                }`}>
                                                    {linkify(msg.text)}
                                                </div>
                                                <span className="text-[10px] text-[#777682] font-semibold mt-1 px-1 flex items-center gap-1">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {isMine && <span className="material-symbols-outlined text-[12px] text-[#EAB308]">check_circle</span>}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}

                                {/* Resolution & Satisfaction Rating */}
                                {ticket && ticket.status === 'closed' && (
                                    <div className="bg-white border border-[#e0e2eb] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col items-center text-center gap-3">
                                        <span className="material-symbols-outlined text-[#006e73] text-[32px]">check_circle</span>
                                        <div>
                                            <p className="font-bold text-[#181c22] text-[14px]">Conversation Resolved</p>
                                            <p className="text-[12px] text-[#777682] mt-1">
                                                {ticket.rating ? 'Thanks for your feedback!' : 'How did we do?'}
                                            </p>
                                        </div>

                                        {ticket.rating ? (
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <span key={n} className={`material-symbols-outlined text-[22px] ${n <= ticket.rating ? 'text-[#f59e0b]' : 'text-[#e0e2eb]'}`}>star</span>
                                                ))}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(n => (
                                                        <button
                                                            key={n}
                                                            type="button"
                                                            disabled={isSubmittingRating}
                                                            onMouseEnter={() => setHoverRating(n)}
                                                            onMouseLeave={() => setHoverRating(0)}
                                                            onClick={() => setRatingValue(n)}
                                                            className="disabled:opacity-50"
                                                        >
                                                            <span className={`material-symbols-outlined text-[26px] transition-colors ${n <= (hoverRating || ratingValue) ? 'text-[#f59e0b]' : 'text-[#e0e2eb]'}`}>star</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    value={feedbackText}
                                                    onChange={(e) => setFeedbackText(e.target.value)}
                                                    disabled={isSubmittingRating}
                                                    placeholder="Any additional feedback for our team?"
                                                    rows={2}
                                                    className="w-full bg-[#F4F9F8] border border-[#c7c5d3] rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-[#075e51] resize-none disabled:opacity-50"
                                                />
                                                <button
                                                    onClick={handleSubmitRating}
                                                    disabled={ratingValue === 0 || isSubmittingRating}
                                                    className="w-full py-2 bg-[#075e51] text-white rounded-lg text-[12px] font-bold disabled:opacity-50 hover:bg-[#097969] transition-colors flex items-center justify-center gap-2"
                                                >
                                                    {isSubmittingRating && <span className="material-symbols-outlined text-[16px] animate-spin">autorenew</span>}
                                                    Submit Rating
                                                </button>
                                            </>
                                        )}

                                        <button
                                            onClick={handleStartNewConversation}
                                            className="w-full py-2 border border-[#c7c5d3] text-[#075e51] rounded-lg text-[12px] font-bold hover:bg-[#f1f3fc] transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">restart_alt</span> Start New Conversation
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    {isTicketOpen && (
                        <form onSubmit={handleSendMessage} className="p-4 sm:p-5 bg-white border-t border-[#e0e2eb] shrink-0">
                            <div className="flex gap-2 items-end">
                                <textarea
                                    ref={textareaRef}
                                    rows={1}
                                    placeholder="Type your message... (Shift+Enter for new line)"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={handleComposerKeyDown}
                                    className="flex-1 bg-[#F4F9F8] border border-[#c7c5d3] rounded-2xl px-4 py-2.5 text-[13px] sm:text-[14px] focus:outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51] transition-shadow resize-none max-h-28 overflow-y-auto"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || isSending}
                                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#075e51] text-white flex items-center justify-center disabled:opacity-50 hover:bg-[#097969] transition-colors shrink-0"
                                >
                                    {isSending ? (
                                        <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px] sm:text-[20px] ml-0.5">send</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </>
            ) : (
                /* Instant Help & FAQs Tab */
                <div className="flex-1 overflow-y-auto flex flex-col bg-[#F4F9F8] min-h-0">
                    <div className="p-4 sm:p-5 border-b border-[#e0e2eb] bg-white shrink-0">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777682] text-[18px]">search</span>
                            <input
                                type="text"
                                value={helpSearch}
                                onChange={(e) => setHelpSearch(e.target.value)}
                                placeholder="Search Audio, AI Reports, Coins, Seminars..."
                                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#c7c5d3] bg-[#F4F9F8] text-[13px] focus:outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-2">
                        {filteredFaqs.length > 0 ? (
                            filteredFaqs.map((faq, i) => {
                                const open = openFaqIndex === i;
                                return (
                                    <div key={i} className="bg-white border border-[#e0e2eb] rounded-lg overflow-hidden">
                                        <button onClick={() => setOpenFaqIndex(open ? null : i)} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#f1f3fc] transition-colors">
                                            <span className="text-[12px] font-bold text-[#181c22] pr-3">{faq.question}</span>
                                            <span className={`material-symbols-outlined text-[#777682] text-[18px] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>
                                        {open && (
                                            <div className="px-4 pb-3 text-[12px] text-[#464651] leading-relaxed break-words">
                                                {faq.answer}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-[12px] text-[#777682] py-8">No results for "{helpSearch}"</p>
                        )}
                    </div>
                    <div className="p-4 border-t border-[#e0e2eb] bg-white shrink-0">
                        <button onClick={() => setActiveTab('chat')} className="w-full text-[12px] font-bold text-[#075e51] hover:underline flex items-center justify-center gap-1.5">
                            Can't find what you need? Start a live chat <span className="material-symbols-outlined text-[16px]">forum</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
