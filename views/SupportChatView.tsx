
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, User as UserIcon, Headset, Loader2, ShieldCheck, Clock, CheckCircle2, MessageSquare, Plus, ChevronLeft, Menu, Home } from 'lucide-react';
import { useSession } from '../components/SessionContext';
import { supabase } from '../lib/supabase';
import { getOrCreateSupportRoom, fetchUserSupportRooms, fetchSupportMessages, sendSupportMessage } from '../services/dataService';
import { SupportRoom, SupportMessage } from '../types';
import { Button, Input, LazyImage } from '../components/UI';
import { SEO } from '../components/SEO';
import { DEFAULT_OWNER_AVATAR } from '../constants'; // Use owner avatar for admin representation

interface SupportChatViewProps {
    onBack: () => void;
    onLoginReq: () => void;
    onHome?: () => void; // New prop for Home navigation
}

export const SupportChatView: React.FC<SupportChatViewProps> = ({ onBack, onLoginReq, onHome }) => {
    const { user, isDarkMode } = useSession();
    
    // Data State
    const [rooms, setRooms] = useState<SupportRoom[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<SupportRoom | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    
    // UI State
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // For desktop split view
    
    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Determine if mobile view based on window width (simple check for initial render)
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Scroll to bottom helper
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 1. Load Rooms on Mount (NO AUTO CREATION)
    useEffect(() => {
        const init = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }
            try {
                const fetchedRooms = await fetchUserSupportRooms(user.id);
                setRooms(fetchedRooms);
                
                // Auto-select latest room if available
                if (fetchedRooms.length > 0) {
                    setSelectedRoom(fetchedRooms[0]);
                }
            } catch (e) {
                console.error("Failed to load support rooms", e);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [user]);

    // 2. Load Messages & Subscribe when Room Selected
    useEffect(() => {
        if (!selectedRoom) return;

        let messageSubscription: any;
        const loadMessages = async () => {
            const msgs = await fetchSupportMessages(selectedRoom.id);
            setMessages(msgs);
            setTimeout(scrollToBottom, 100);

            // Subscribe to new messages in THIS room
            messageSubscription = supabase
                .channel(`room:${selectedRoom.id}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'support_messages', 
                    filter: `room_id=eq.${selectedRoom.id}` 
                }, (payload) => {
                    const newMsg = payload.new as SupportMessage;
                    setMessages(prev => [...prev, newMsg]);
                    setTimeout(scrollToBottom, 100);
                })
                .subscribe();
        };

        loadMessages();

        // Close sidebar on mobile when room selected
        if (isMobile) setIsSidebarOpen(false);

        return () => {
            if (messageSubscription) supabase.removeChannel(messageSubscription);
        };
    }, [selectedRoom, isMobile]);

    const handleCreateNewTicket = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Force create new room logic
            const newRoom = await getOrCreateSupportRoom(user.id);
            if (newRoom) {
                // Check if it's already in list
                const exists = rooms.find(r => r.id === newRoom.id);
                if (!exists) setRooms(prev => [newRoom, ...prev]);
                setSelectedRoom(newRoom);
                if (isMobile) setIsSidebarOpen(false);
            }
        } catch (e) {
            console.error("Err creating ticket", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !selectedRoom || !user || isSending) return;
        if (selectedRoom.status === 'closed') return;

        const msg = inputText.trim();
        setInputText(''); // Optimistic clear
        setIsSending(true);

        try {
            await sendSupportMessage(selectedRoom.id, user.id, msg);
            // Scroll happens via subscription callback
        } catch (e) {
            console.error("Send failed", e);
            setInputText(msg); // Restore on failure
        } finally {
            setIsSending(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0F172A] text-center text-white">
                <Headset size={64} className="text-blue-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Live Support</h1>
                <p className="text-gray-400 mb-6">Silakan login untuk memulai chat.</p>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={onBack} className="border-gray-600 text-gray-300 hover:bg-gray-800">Kembali</Button>
                    <Button onClick={onLoginReq}>Login Sekarang</Button>
                </div>
            </div>
        );
    }

    if (isLoading && rooms.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    // --- RENDER HELPERS ---

    const renderSidebar = () => (
        <div className={`
            flex flex-col bg-[#1E293B] border-r border-slate-700 h-full
            ${isMobile ? (isSidebarOpen ? 'fixed inset-0 z-50 w-full' : 'hidden') : 'w-80 shrink-0'}
        `}>
            {/* Sidebar Header - Added Safe Area Padding */}
            <div className="p-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] border-b border-slate-700 flex justify-between items-center bg-[#151e32] shrink-0">
                <div>
                    <h2 className="text-white font-bold text-lg">Live Support</h2>
                    <p className="text-slate-400 text-xs">{rooms.length} Percakapan</p>
                </div>
                {isMobile && (
                    <button onClick={onBack} className="p-2 text-slate-400 hover:text-white">
                        <ArrowLeft size={20} />
                    </button>
                )}
            </div>

            {/* Room List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {/* Create New Button */}
                <button 
                    onClick={handleCreateNewTicket}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 transition-colors border border-blue-600/30 mb-4"
                >
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                        <Plus size={20} />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-sm">Buat Tiket Baru</p>
                        <p className="text-xs opacity-70">Mulai percakapan baru</p>
                    </div>
                </button>

                {rooms.map(room => {
                    const isSelected = selectedRoom?.id === room.id;
                    return (
                        <div 
                            key={room.id}
                            onClick={() => {
                                setSelectedRoom(room);
                                // Explicitly close sidebar on mobile to ensure navigation happens immediately
                                if (window.innerWidth < 768) setIsSidebarOpen(false);
                            }}
                            className={`
                                flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                                ${isSelected 
                                    ? 'bg-slate-700/50 border-slate-600' 
                                    : 'bg-transparent border-transparent hover:bg-slate-800 hover:border-slate-700'
                                }
                            `}
                        >
                            <div className="relative">
                                <LazyImage src={DEFAULT_OWNER_AVATAR} className="w-10 h-10 rounded-full bg-slate-800" alt="Admin" />
                                {room.status === 'open' && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#1E293B] rounded-full"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                    <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                        Admin Nongkrongr
                                    </h4>
                                    <span className="text-[10px] text-slate-500">
                                        {new Date(room.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                    </span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <p className="text-xs text-slate-400 truncate max-w-[120px]">
                                        #{room.id.slice(0,8)}
                                    </p>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${room.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/30 text-slate-400'}`}>
                                        {room.status === 'open' ? 'Aktif' : 'Selesai'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Sidebar Footer: Home Button */}
            <div className="p-3 border-t border-slate-700 bg-[#151e32]">
                <button 
                    onClick={onHome || onBack}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors font-bold text-sm border border-slate-700 shadow-sm"
                >
                    <Home size={18} /> Kembali ke Beranda
                </button>
            </div>
        </div>
    );

    const renderChatArea = () => {
        if (!selectedRoom) return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[#0B1120]">
                <MessageSquare size={48} className="mb-4 opacity-20" />
                <p>Pilih percakapan untuk memulai atau buat tiket baru.</p>
            </div>
        );

        return (
            <div className="flex-1 flex flex-col h-full bg-[#0B1120] relative">
                {/* Chat Header - Added Safe Area Padding and height adjustment */}
                <div className="min-h-16 py-3 pt-[calc(env(safe-area-inset-top)+1rem)] px-6 border-b border-slate-800 flex items-center justify-between bg-[#0F172A] shrink-0 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        {isMobile && (
                            <button onClick={() => setIsSidebarOpen(true)} className="mr-2 text-slate-400">
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        <div className="relative">
                            <LazyImage src={DEFAULT_OWNER_AVATAR} className="w-10 h-10 rounded-full" alt="Admin" />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0F172A] rounded-full animate-pulse"></div>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Admin Nongkrongr</h3>
                            <p className="text-slate-400 text-xs flex items-center gap-1">
                                <Clock size={10} /> 
                                {selectedRoom.status === 'open' ? 'Biasanya membalas dalam 5 menit' : 'Tiket Selesai'}
                            </p>
                        </div>
                    </div>
                    {selectedRoom.status === 'closed' && (
                        <div className="px-3 py-1 bg-slate-800 rounded-lg text-xs font-bold text-slate-400 border border-slate-700">
                            Tandai Selesai
                        </div>
                    )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg) => {
                        const isMe = msg.sender_id === user.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                {!isMe && (
                                    <div className="w-8 h-8 rounded-full overflow-hidden mr-3 shrink-0 self-end mb-1">
                                        <LazyImage src={DEFAULT_OWNER_AVATAR} className="w-full h-full object-cover" alt="Admin" />
                                    </div>
                                )}
                                <div className={`max-w-[75%] rounded-2xl px-5 py-3.5 shadow-md text-sm leading-relaxed relative ${
                                    isMe 
                                    ? 'bg-[#2563EB] text-white rounded-br-none' 
                                    : 'bg-[#1E293B] text-slate-200 rounded-bl-none border border-slate-700'
                                }`}>
                                    {msg.message}
                                    <span className={`text-[10px] block mt-1.5 text-right opacity-60 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    
                    {selectedRoom.status === 'closed' && (
                        <div className="flex justify-center py-6">
                            <div className="bg-slate-800/50 border border-slate-700 text-slate-400 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                                <CheckCircle2 size={14} /> Percakapan ini telah diselesaikan
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-[#0F172A] border-t border-slate-800 shrink-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                    {selectedRoom.status === 'open' ? (
                        <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto">
                            <input 
                                type="text" 
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Ketik balasan..."
                                className="flex-1 bg-[#1E293B] border border-slate-700 rounded-xl px-5 py-3.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-slate-500 transition-all"
                            />
                            <button 
                                type="submit" 
                                disabled={!inputText.trim() || isSending}
                                className="p-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl shadow-lg transition-all active:scale-95"
                            >
                                {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                            </button>
                        </form>
                    ) : (
                        <div className="flex justify-center">
                            <Button onClick={handleCreateNewTicket} className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600">
                                Mulai Tiket Baru
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#0B1120] flex text-sans">
            <SEO title="Live Support - Nongkrongr" />
            
            {renderSidebar()}
            {renderChatArea()}
        </div>
    );
};
