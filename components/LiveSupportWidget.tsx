
import React, { useState, useEffect, useRef } from 'react';
import { Headset, X, MessageSquare } from 'lucide-react';
import { useSession } from './SessionContext';
import { countUnreadSupportMessages } from '../services/dataService';
import { supabase } from '../lib/supabase';

interface LiveSupportWidgetProps {
    onOpenSupport: () => void;
}

type WidgetPosition = {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
};

export const LiveSupportWidget: React.FC<LiveSupportWidgetProps> = ({ onOpenSupport }) => {
    const { user } = useSession();
    const [isVisible, setIsVisible] = useState(true);
    const [hasUnread, setHasUnread] = useState(false);
    
    // Position State: Supports Top/Left OR Bottom/Right anchoring
    // Default: Bottom Right (Safe from Mobile Nav)
    const [pos, setPos] = useState<WidgetPosition>({ right: 20, bottom: 100 });
    const [isDragging, setIsDragging] = useState(false);
    
    const dragOffset = useRef({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLDivElement>(null);
    const isClick = useRef(true);

    useEffect(() => {
        const dismissed = sessionStorage.getItem('support_widget_dismissed');
        if (dismissed) setIsVisible(false);
    }, []);

    // Check unread messages on mount & Realtime
    useEffect(() => {
        if (!user) return;

        const checkUnread = async () => {
            const count = await countUnreadSupportMessages(user.id);
            setHasUnread(count > 0);
        };
        
        checkUnread();

        const channel = supabase.channel('support_widget_badge')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
                const msg = payload.new as any;
                if (msg.sender_id !== user.id) {
                    setHasUnread(true);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    // Handle Drag Events
    const handleStart = (clientX: number, clientY: number) => {
        if (!buttonRef.current) return;
        isClick.current = true;
        
        const rect = buttonRef.current.getBoundingClientRect();
        
        // LOCK to Top/Left coordinates during drag for stability
        setPos({
            left: rect.left,
            top: rect.top,
            right: undefined,
            bottom: undefined
        });
        
        dragOffset.current = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
        
        setIsDragging(true);
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!isDragging) return;
        isClick.current = false;
        
        let newX = clientX - dragOffset.current.x;
        let newY = clientY - dragOffset.current.y;

        // Boundaries
        const maxX = window.innerWidth - 60; 
        const maxY = window.innerHeight - 60; 

        // Clamp
        if (newX < 10) newX = 10;
        if (newX > maxX) newX = maxX;
        if (newY < 10) newY = 10;
        if (newY > maxY) newY = maxY;

        setPos({ left: newX, top: newY });
    };

    const handleEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        
        // Determine closest edges (Snap Logic)
        const midX = window.innerWidth / 2;
        const midY = window.innerHeight / 2;
        
        const isLeft = rect.left + rect.width/2 < midX;
        const isTop = rect.top + rect.height/2 < midY;
        
        const newPos: WidgetPosition = {};
        
        // Horizontal Snap
        if (isLeft) {
            newPos.left = 20;
        } else {
            newPos.right = 20;
        }
        
        // Vertical Anchor Strategy:
        // Use 'bottom' CSS property if in lower half to stay fixed to bottom when address bar moves
        if (isTop) {
            let topVal = rect.top;
            if (topVal < 20) topVal = 20; // Safe area
            newPos.top = topVal;
        } else {
            const bottomSpace = window.innerHeight - rect.bottom;
            let finalBottom = bottomSpace;
            
            // Mobile Nav Safe Area (~90px)
            if (window.innerWidth < 768 && finalBottom < 90) {
                finalBottom = 90;
            } else if (finalBottom < 20) {
                finalBottom = 20;
            }
            
            newPos.bottom = finalBottom;
        }
        
        setPos(newPos);
    };

    // Mouse Events
    const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    // Touch Events
    const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd = () => handleEnd();

    // Global listeners
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            window.addEventListener('touchend', onTouchEnd);
        } else {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [isDragging]);

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(false);
        sessionStorage.setItem('support_widget_dismissed', 'true');
    };

    const handleClick = () => {
        if (isClick.current) {
            onOpenSupport();
        }
    };

    if (!isVisible) return null;

    return (
        <div 
            ref={buttonRef}
            style={{ 
                position: 'fixed',
                zIndex: 9999,
                touchAction: 'none',
                // Dynamic Styles
                left: pos.left,
                right: pos.right,
                top: pos.top,
                bottom: pos.bottom
            }}
            className={`transition-transform duration-100 ${isDragging ? 'scale-110 cursor-grabbing' : 'cursor-grab transition-all ease-out duration-300'}`}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onClick={handleClick}
        >
            <div className="relative group">
                {/* Dismiss Button */}
                <button 
                    onClick={handleDismiss}
                    className="absolute -top-2 -left-2 bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-full p-1 shadow-md hover:bg-red-500 hover:text-white transition-colors z-20 opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 duration-200"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    <X size={12} />
                </button>

                {/* Main Button */}
                <div 
                    className={`w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center relative border-2 border-white dark:border-slate-800 ${hasUnread ? 'animate-bounce' : ''}`}
                >
                    {hasUnread ? <MessageSquare size={26} /> : <Headset size={28} />}
                    
                    {hasUnread && (
                        <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white dark:border-slate-800"></span>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
