
import React, { useState, useMemo } from 'react';
import { ShoppingCart, X, Plus, Minus, ChevronRight, Store, Trash2, CreditCard, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useSession } from './SessionContext';
import { Button, LazyImage, Modal } from './UI';
import { createOrder } from '../services/dataService';

interface GlobalCartOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    addToast: (type: 'success' | 'error' | 'info', message: string) => void;
    onLoginReq: () => void;
}

export const GlobalCartOverlay: React.FC<GlobalCartOverlayProps> = ({ isOpen, onClose, addToast, onLoginReq }) => {
    const { cart, user, addToGlobalCart, removeFromGlobalCart, clearCafeCart } = useSession();
    
    // UI Local State for Checkout
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null); // cafeId
    const [showSuccess, setShowSuccess] = useState(false);
    const [checkoutDetails, setCheckoutDetails] = useState<Record<string, { type: 'dine-in' | 'takeaway', table: string }>>({});

    const cafeGroups = useMemo(() => Object.values(cart), [cart]);
    const totalItems = useMemo(() => cafeGroups.reduce((acc, group) => acc + group.items.reduce((a, b) => a + b.quantity, 0), 0), [cafeGroups]);

    const handleUpdateCheckout = (cafeId: string, updates: any) => {
        setCheckoutDetails(prev => ({
            ...prev,
            [cafeId]: { ...(prev[cafeId] || { type: 'dine-in', table: '' }), ...updates }
        }));
    };

    const handlePlaceOrder = async (cafeId: string) => {
        if (!user) { onLoginReq(); return; }
        
        const group = cart[cafeId];
        const details = checkoutDetails[cafeId] || { type: 'dine-in', table: '' };
        
        if (details.type === 'dine-in' && !details.table) {
            addToast('error', 'Silakan isi nomor meja.');
            return;
        }

        setIsSubmitting(cafeId);
        try {
            const totalAmount = group.items.reduce((acc, curr) => acc + (curr.price_at_order * curr.quantity), 0);
            
            await createOrder({
                cafe_id: group.cafe.id,
                cafe_owner_id: group.cafe.owner_id,
                user_id: user.id,
                customer_name: user.name,
                order_type: details.type,
                table_number: details.table,
                total_amount: totalAmount
            }, group.items);
            
            clearCafeCart(cafeId);
            addToast('success', `Pesanan di ${group.cafe.name} terkirim!`);
            
            if (Object.keys(cart).length === 1) {
                setShowSuccess(true);
            }
        } catch (e) {
            addToast('error', 'Gagal memproses pesanan.');
        } finally {
            setIsSubmitting(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10001] flex items-end md:items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={onClose}></div>
            
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-[3.5rem] md:rounded-[3rem] flex flex-col max-h-[92vh] overflow-hidden relative z-10 animate-in slide-in-from-bottom duration-500 shadow-2xl">
                
                {/* Header */}
                <div className="p-8 pb-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-display font-black text-2xl text-gray-900 dark:text-white flex items-center gap-3">
                            <ShoppingCart size={28} className="text-orange-500" /> Keranjang Belanja
                        </h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total {totalItems} menu dari {cafeGroups.length} kafe</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
                    {cafeGroups.length === 0 ? (
                        <div className="py-20 text-center opacity-40 flex flex-col items-center">
                            <ShoppingCart size={64} strokeWidth={1} className="mb-6" />
                            <h4 className="font-black text-sm uppercase tracking-widest">Keranjang Kosong</h4>
                            <p className="text-xs mt-2">Belum ada menu yang kamu pilih.</p>
                        </div>
                    ) : (
                        cafeGroups.map((group) => (
                            <div key={group.cafe.id} className="bg-gray-50 dark:bg-slate-800/50 rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-slate-800">
                                {/* Cafe Header */}
                                <div className="p-5 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                                            <LazyImage src={group.cafe.image} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <h4 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-tight">{group.cafe.name}</h4>
                                    </div>
                                    <button onClick={() => clearCafeCart(group.cafe.id)} className="text-gray-400 hover:text-red-500 p-2 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                {/* Items List */}
                                <div className="p-5 space-y-4">
                                    {group.items.map(item => (
                                        <div key={item.menu_item_id} className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white">
                                                <LazyImage src={item.menu_item?.image_url || ''} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-bold text-gray-900 dark:text-white text-sm truncate">{item.menu_item?.name}</h5>
                                                <p className="text-xs text-orange-600 font-bold">Rp {item.price_at_order.toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => removeFromGlobalCart(item.menu_item_id, group.cafe.id)} 
                                                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700 flex items-center justify-center dark:text-white"
                                                >
                                                    <Minus size={14}/>
                                                </button>
                                                <span className="font-black text-sm dark:text-white">{item.quantity}</span>
                                                <button 
                                                    onClick={() => addToGlobalCart(item.menu_item!, group.cafe as any)} 
                                                    className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center"
                                                >
                                                    <Plus size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Per-Cafe Checkout Actions */}
                                <div className="p-5 bg-orange-50/30 dark:bg-orange-900/10 border-t border-orange-100 dark:border-orange-900/20">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipe Pesanan</p>
                                            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-gray-100 dark:border-slate-700">
                                                <button 
                                                    onClick={() => handleUpdateCheckout(group.cafe.id, { type: 'dine-in' })}
                                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${(checkoutDetails[group.cafe.id]?.type || 'dine-in') === 'dine-in' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-400'}`}
                                                >DINE IN</button>
                                                <button 
                                                    onClick={() => handleUpdateCheckout(group.cafe.id, { type: 'takeaway' })}
                                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${(checkoutDetails[group.cafe.id]?.type || 'dine-in') === 'takeaway' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-400'}`}
                                                >TAKEAWAY</button>
                                            </div>
                                        </div>
                                        
                                        {(checkoutDetails[group.cafe.id]?.type || 'dine-in') === 'dine-in' && (
                                            <div className="space-y-1.5">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Nomor Meja</p>
                                                <input 
                                                    type="text" 
                                                    placeholder="Cth: 07"
                                                    value={checkoutDetails[group.cafe.id]?.table || ''}
                                                    onChange={(e) => handleUpdateCheckout(group.cafe.id, { table: e.target.value })}
                                                    className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 font-bold text-sm text-gray-900 dark:text-white"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">Subtotal {group.cafe.name.split(' ')[0]}</p>
                                            <p className="text-lg font-black text-gray-900 dark:text-white leading-none">
                                                Rp {group.items.reduce((a,b) => a + (b.price_at_order * b.quantity), 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handlePlaceOrder(group.cafe.id)}
                                            disabled={isSubmitting !== null}
                                            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {isSubmitting === group.cafe.id ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                                            Checkout
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Main Footer for Modal */}
                <div className="p-8 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex items-center justify-between">
                    <button onClick={onClose} className="text-sm font-bold text-gray-400 hover:text-orange-500 transition-colors">Kembali Eksplor</button>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">Total Belanja</span>
                        <span className="text-2xl font-black text-orange-600">
                            Rp {cafeGroups.reduce((acc, group) => acc + group.items.reduce((a, b) => a + (b.price_at_order * b.quantity), 0), 0).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            <Modal isOpen={showSuccess} onClose={() => { setShowSuccess(false); onClose(); }} title="Pesanan Berhasil!">
                <div className="text-center py-6">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">Semua Terkirim!</h3>
                    <p className="text-gray-500 text-sm mb-8">Dapur kafe sedang meracik hidanganmu. Pantau statusnya di dashboard ya!</p>
                    <Button onClick={() => { setShowSuccess(false); onClose(); }} className="w-full">Mantap!</Button>
                </div>
            </Modal>
        </div>
    );
};
