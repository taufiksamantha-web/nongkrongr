import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import FloatingNotification from '../components/common/FloatingNotification';
import { PaperAirplaneIcon, EnvelopeIcon } from '@heroicons/react/24/solid';

const FeedbackPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || (!currentUser && !name.trim())) {
            setNotification({ message: 'Nama dan pesan tidak boleh kosong.', type: 'error' });
            return;
        }

        setIsLoading(true);
        setNotification(null);

        const { error } = await supabase.from('feedback').insert({
            name: currentUser ? currentUser.username : name,
            message,
            user_id: currentUser ? currentUser.id : null,
        });

        if (error) {
            setNotification({ message: `Gagal mengirim masukan: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: 'Terima kasih! Masukan Anda telah kami terima.', type: 'success' });
            setMessage('');
            if (!currentUser) setName('');
        }
        setIsLoading(false);
    };

    return (
        <div className="container mx-auto px-6 py-12">
             {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            <div className="max-w-2xl mx-auto text-center">
                <EnvelopeIcon className="h-16 w-16 mx-auto text-brand mb-4" />
                <h1 className="text-4xl md:text-5xl font-extrabold font-jakarta text-primary dark:text-white">
                    Saran & Masukan
                </h1>
                <p className="mt-4 text-lg text-muted">
                    Punya ide, kritik, atau saran untuk membuat Nongkrongr lebih baik? Kami sangat ingin mendengarnya!
                </p>
            </div>

            <div className="max-w-2xl mx-auto mt-12 bg-card p-8 rounded-3xl shadow-lg border border-border">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {currentUser ? (
                        <div className="bg-soft dark:bg-gray-700/50 p-4 rounded-xl border border-border">
                            <p className="text-muted text-sm">Mengirim sebagai:</p>
                            <p className="font-bold text-lg text-primary">{currentUser.username}</p>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="name" className="font-semibold block mb-2 text-primary">Nama Anda</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nama panggilan Anda"
                                className="w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl"
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor="message" className="font-semibold block mb-2 text-primary">Pesan Anda</label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Tuliskan ide atau masukan Anda di sini..."
                            className="w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl h-40"
                            required
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-brand text-white font-bold py-3 px-6 rounded-2xl text-lg hover:bg-brand/90 transition-all disabled:bg-brand/50 disabled:cursor-wait"
                    >
                        {isLoading ? 'Mengirim...' : 'Kirim Masukan'}
                        <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default FeedbackPage;
