
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LoginForm: React.FC = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const emailInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Otomatis fokus ke input email saat komponen dimuat
        emailInputRef.current?.focus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const { error: authError } = await login(email, password);
        if (authError) {
            setError(authError.message || 'Email atau password salah.');
        }
        setLoading(false);
    };

    return (
        <div className="max-w-md mx-auto mt-12 md:mt-20 px-4">
            <Link to="/" className="flex justify-center mb-8">
                <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-12 w-auto" />
            </Link>
            <form onSubmit={handleSubmit} className="bg-card p-8 rounded-3xl shadow-lg space-y-6 border border-border">
                <h1 className="text-3xl font-bold font-jakarta text-center">Dashboard Login</h1>
                <p className="text-center text-muted">Gunakan email & password akun Supabase Anda.</p>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-xl text-center">{error}</p>}
                <div>
                    <label className="font-semibold">Email</label>
                    <input
                        ref={emailInputRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-2 w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                        required
                        placeholder="e.g., admin@example.com"
                    />
                </div>
                <div>
                    <label className="font-semibold">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-2 w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                        required
                        placeholder="••••••••"
                    />
                </div>
                <button type="submit" className="w-full bg-brand text-white font-bold py-3 rounded-2xl text-lg hover:bg-brand/90 transition-all disabled:bg-brand/50" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
                <div className="text-center pt-2">
                    <Link to="/" className="text-sm text-muted hover:text-brand transition-colors duration-300">
                        &larr; Kembali ke Home
                    </Link>
                </div>
            </form>
        </div>
    );
};

export default LoginForm;
