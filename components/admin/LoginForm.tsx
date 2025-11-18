
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

type FormMode = 'login' | 'signup';

const LoginForm: React.FC = () => {
    const { login, signup } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState<FormMode>('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isCafeAdmin, setIsCafeAdmin] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const loginInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loginInputRef.current?.focus();
        setError('');
        // Do not clear success message on mode change, so user can see it after form switches.
        // setSuccessMessage(''); 
        
        // Clear fields on mode change for better UX, but only if not coming from a successful signup
        if (!successMessage) {
            setUsername('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
        }
    }, [mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        if (mode === 'signup') {
            if (password.length < 6) {
                setError("Password minimal 6 karakter.");
                setLoading(false);
                return;
            }
            if (password !== confirmPassword) {
                setError("Password dan konfirmasi password tidak cocok.");
                setLoading(false);
                return;
            }
            if (username.length < 3) {
                setError("Username minimal 3 karakter.");
                setLoading(false);
                return;
            }
            const { error: authError } = await signup(username, email, password, isCafeAdmin);
            if (authError) {
                 setError(authError.message || 'Gagal mendaftar. Email atau username mungkin sudah digunakan.');
            } else {
                if (isCafeAdmin) {
                    setSuccessMessage('Pendaftaran sebagai pengelola berhasil! Akun Anda akan aktif setelah disetujui oleh admin.');
                } else {
                    setSuccessMessage('Pendaftaran berhasil! Silakan login untuk melanjutkan.');
                }
                // Reset form fields after successful signup
                setUsername('');
                setEmail(''); // Keep email for login convenience? No, user might have used username. Clear all.
                setPassword('');
                setConfirmPassword('');
                setMode('login');
                setIsCafeAdmin(false);
            }
        } else {
            // 'email' state here holds either username or email
            const { error: authError } = await login(email, password);
            if (authError) {
                setError(authError.message || 'Username/email atau password salah.');
            } else {
                navigate('/');
            }
        }
        setLoading(false);
    };

    return (
        <div className="max-w-md mx-auto mt-12 md:mt-20 px-4 w-full">
            <Link to="/" className="flex justify-center mb-8">
                <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-12 w-auto" />
            </Link>
            <div className="bg-card p-8 rounded-3xl shadow-lg border border-border">
                <div className="flex bg-soft dark:bg-gray-700/50 p-1 rounded-xl mb-6">
                    <button 
                        onClick={() => setMode('login')}
                        className={`w-1/2 py-2 text-sm font-bold rounded-lg transition-colors ${mode === 'login' ? 'bg-brand text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        Login
                    </button>
                    <button 
                        onClick={() => setMode('signup')}
                        className={`w-1/2 py-2 text-sm font-bold rounded-lg transition-colors ${mode === 'signup' ? 'bg-brand text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        Daftar
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <h1 className="text-3xl font-bold font-jakarta text-center">
                        {mode === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
                    </h1>
                    {error && <p className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 p-3 rounded-xl text-center text-sm font-semibold">{error}</p>}
                    {successMessage && <p className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 p-3 rounded-xl text-center text-sm font-semibold">{successMessage}</p>}
                    
                    {mode === 'signup' && (
                         <div>
                            <label htmlFor="username" className="font-semibold">Username</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="mt-2 w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                                required
                                placeholder="Buat username unik"
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor="email" className="font-semibold">{mode === 'login' ? 'Email atau Username' : 'Email'}</label>
                        <input
                            id="email"
                            ref={loginInputRef}
                            type={mode === 'login' ? 'text' : 'email'}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-2 w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                            required
                            placeholder={mode === 'login' ? 'Masukkan username atau email' : 'Masukkan email aktif'}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="font-semibold">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-2 w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                            required
                            placeholder={mode === 'login' ? 'Masukkan password' : 'Password (minimal 6 karakter)'}
                        />
                    </div>

                    {mode === 'signup' && (
                         <div>
                            <label htmlFor="confirmPassword" className="font-semibold">Konfirmasi Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-2 w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                                required
                                placeholder="Konfirmasi password"
                            />
                        </div>
                    )}

                    {mode === 'signup' && (
                        <div className="flex items-center gap-3 p-3 bg-soft dark:bg-gray-700/50 rounded-xl border border-border">
                            <input
                                id="isCafeAdmin"
                                type="checkbox"
                                checked={isCafeAdmin}
                                onChange={(e) => setIsCafeAdmin(e.target.checked)}
                                className="h-5 w-5 rounded text-brand focus:ring-brand border-gray-400"
                            />
                            <label htmlFor="isCafeAdmin" className="font-semibold text-primary cursor-pointer">Daftar sebagai Pengelola Kafe</label>
                        </div>
                    )}


                    <button type="submit" className="w-full bg-brand text-white font-bold py-3 rounded-2xl text-lg hover:bg-brand/90 transition-all disabled:bg-brand/50" disabled={loading}>
                        {loading ? 'Memproses...' : (mode === 'login' ? 'Login' : 'Daftar')}
                    </button>
                    <div className="text-center pt-2">
                        <Link to="/" className="text-sm text-muted hover:text-brand transition-colors duration-300">
                            &larr; Kembali ke Home
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;