
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FloatingNotification from '../components/common/FloatingNotification';

const ResetPasswordPage: React.FC = () => {
    const { updatePassword } = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Validate session presence (Supabase handles this via hash fragment automatically)
    // If no session, the updatePassword call will fail, which is fine.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setNotification(null);

        if (password.length < 6) {
            setNotification({ message: 'Password minimal 6 karakter.', type: 'error' });
            return;
        }
        if (password !== confirmPassword) {
            setNotification({ message: 'Konfirmasi password tidak cocok.', type: 'error' });
            return;
        }

        setLoading(true);
        const { error } = await updatePassword(password);
        setLoading(false);

        if (error) {
            setNotification({ message: `Gagal mereset password: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: 'Password berhasil diperbarui! Mengalihkan ke login...', type: 'success' });
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        }
    };

    return (
        <div className="min-h-screen bg-soft flex items-center justify-center p-4">
             {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            <div className="bg-card p-8 rounded-3xl shadow-lg border border-border w-full max-w-md">
                <h1 className="text-2xl font-bold font-jakarta text-center mb-6 text-primary dark:text-white">Atur Ulang Password</h1>
                <p className="text-muted text-center mb-6 text-sm">Masukkan password baru untuk akun Anda.</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="new-password" className="font-semibold text-primary dark:text-gray-200">Password Baru</label>
                        <input
                            id="new-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-2 w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                            required
                            placeholder="Minimal 6 karakter"
                        />
                    </div>
                    <div>
                        <label htmlFor="confirm-password" className="font-semibold text-primary dark:text-gray-200">Konfirmasi Password</label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-2 w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                            required
                            placeholder="Ulangi password baru"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand text-white font-bold py-3 rounded-2xl text-lg hover:bg-brand/90 transition-all disabled:bg-brand/50 disabled:cursor-wait"
                    >
                        {loading ? 'Memproses...' : 'Simpan Password Baru'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
