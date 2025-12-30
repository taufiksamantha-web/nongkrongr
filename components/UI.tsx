
import React, { useState, useEffect, useRef, useMemo, forwardRef } from 'react';
import { LucideIcon, X, CheckCircle, AlertCircle, Info, Check, AlertTriangle, ArrowUp, RefreshCw, ChevronLeft, ChevronRight, BadgeCheck, Loader2, ChevronsLeft, ChevronsRight, MapPin, Search, Crosshair, Clock, History, Globe } from 'lucide-react';
import { getLowResImageUrl } from '../constants';
import { Cafe } from '../types';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    icon?: LucideIcon;
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ 
    variant = 'primary', size = 'md', icon: Icon, isLoading, className = '', children, ...props 
}, ref) => {
    const baseStyles = "flex items-center justify-center font-bold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50",
        secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm",
        danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30",
        ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
        outline: "bg-transparent border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
    };
    const sizes = {
        sm: "px-4 py-2 text-xs",
        md: "px-6 py-3 text-sm",
        lg: "px-8 py-4 text-base"
    };
    return (
        <button ref={ref} className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} disabled={isLoading || props.disabled} {...props}>
            {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : Icon && <Icon className="mr-2" size={18} />}
            {children}
        </button>
    );
});
Button.displayName = 'Button';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, icon: Icon, className = '', ...props }, ref) => (
    <div className="w-full">
        {label && <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">{label}</label>}
        <div className="relative">
            {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />}
            <input 
                ref={ref}
                className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 transition-shadow ${className}`} 
                {...props} 
            />
        </div>
    </div>
));
Input.displayName = 'Input';

export const Badge: React.FC<{ children: React.ReactNode, color?: string, icon?: LucideIcon }> = ({ children, color = "bg-gray-100 text-gray-700", icon: Icon }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${color}`}>
        {Icon && <Icon size={12} className="mr-1" />}
        {children}
    </span>
);

export const LazyImage: React.FC<{ src: string, alt: string, className?: string, fetchPriority?: 'high' | 'low' | 'auto' }> = ({ src, alt, className, fetchPriority = 'auto' }) => {
    const [loaded, setLoaded] = useState(false);
    const lqipUrl = useMemo(() => getLowResImageUrl(src), [src]);
    return (
        <div className={`relative overflow-hidden bg-gray-200 ${className} will-change-transform`}>
            <img 
                src={lqipUrl} 
                alt="" 
                aria-hidden="true"
                className={`absolute inset-0 w-full h-full object-cover blur-xl scale-110 transition-opacity duration-700 ${loaded ? 'opacity-0' : 'opacity-100'}`} 
            />
            <img 
                src={src} 
                alt={alt} 
                className={`relative w-full h-full object-cover transition-opacity duration-700 ease-in-out ${loaded ? 'opacity-100' : 'opacity-0'}`} 
                onLoad={() => setLoaded(true)}
                loading="lazy"
                decoding="async"
                fetchPriority={fetchPriority}
            />
        </div>
    );
};

export const VerifiedBadge: React.FC<{ size?: number, className?: string }> = ({ size = 16, className = "text-blue-500" }) => (
    <BadgeCheck size={size} className={className} fill="currentColor" stroke="rgba(255,255,255,0.8)" />
);

export const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, className?: string }> = ({ isOpen, onClose, title, children, className = '' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>
            <div className={`relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200 ${className}`}>
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const ConfirmModal: React.FC<{ isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }> = ({ isOpen, onClose, onConfirm, title, message }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-sm">
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1">Batal</Button>
            <Button variant="danger" onClick={onConfirm} className="flex-1">Ya, Lanjutkan</Button>
        </div>
    </Modal>
);

export const GlassCard: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white border border-gray-100 shadow-lg rounded-3xl p-6 ${className}`}>
        {children}
    </div>
);

export const Pagination: React.FC<{ currentPage: number, totalPages: number, onPageChange: (page: number) => void }> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    const renderPageNumbers = () => {
        const pages = [];
        const delta = 1; 
        const left = currentPage - delta;
        const right = currentPage + delta + 1;
        const range = [];
        const rangeWithDots = [];
        let l;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= left && i < right)) {
                range.push(i);
            }
        }
        for (const i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }
        return rangeWithDots.map((page, index) => {
            if (page === '...') {
                return <span key={`dots-${index}`} className="px-1 text-gray-400 self-end mb-1">...</span>;
            }
            const isCurrent = currentPage === page;
            return (
                <button
                    key={page}
                    onClick={() => onPageChange(Number(page))}
                    className={`
                        w-9 h-9 md:w-10 md:h-10 rounded-xl text-xs md:text-sm font-bold transition-all
                        ${isCurrent 
                            ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30 scale-110' 
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-orange-200'
                        }
                    `}
                >
                    {page}
                </button>
            );
        });
    };
    return (
        <div className="flex items-center justify-center gap-1.5 md:gap-3 mt-10 animate-in fade-in pb-4">
            <button 
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="p-2 md:p-2.5 rounded-xl bg-white border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-gray-500 hover:text-orange-500"
                title="Halaman Awal"
            >
                <ChevronsLeft size={18} />
            </button>
            <button 
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 md:p-2.5 rounded-xl bg-white border border-gray-100 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-gray-500 hover:text-orange-500"
                title="Sebelumnya"
            >
                <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1 md:gap-2 px-1">
                {renderPageNumbers()}
            </div>
            <button 
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 md:p-2.5 rounded-xl bg-white border border-gray-100 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-gray-500 hover:text-orange-500"
                title="Selanjutnya"
            >
                <ChevronRight size={18} />
            </button>
            <button 
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 md:p-2.5 rounded-xl bg-white border border-gray-100 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-gray-500 hover:text-orange-500"
                title="Halaman Akhir"
            >
                <ChevronsRight size={18} />
            </button>
        </div>
    );
};

export interface ToastMessage { id: string; type: 'success' | 'error' | 'info'; message: string; }
export const ToastContainer: React.FC<{ toasts: ToastMessage[], onClose: (id: string) => void }> = ({ toasts, onClose }) => (
    <div className="fixed bottom-[90px] right-4 md:bottom-8 md:right-8 z-[99999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
            <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-2xl animate-in fade-in duration-300 border border-white/10 backdrop-blur-md ${toast.type === 'success' ? 'bg-green-600/90 text-white' : toast.type === 'error' ? 'bg-red-600/90 text-white' : 'bg-blue-600/90 text-white'}`}>
                {toast.type === 'success' ? <CheckCircle size={20} /> : toast.type === 'error' ? <AlertTriangle size={20} /> : <Info size={20} />}
                <p className="text-sm font-bold">{toast.message}</p>
                <button onClick={() => onClose(toast.id)} className="ml-2 hover:opacity-70"><X size={16} /></button>
            </div>
        ))}
    </div>
);
