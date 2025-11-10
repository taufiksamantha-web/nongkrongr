import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const LoginForm: React.FC = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
        <div className="max-w-md mx-auto mt-20">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg space-y-6">
                <h1 className="text-3xl font-bold font-jakarta text-center">Dashboard Login</h1>
                <p className="text-center text-gray-500 dark:text-gray-400">Gunakan email & password akun Supabase Anda.</p>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-xl text-center">{error}</p>}
                <div>
                    <label className="font-semibold">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-2 w-full p-3 border rounded-xl text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        className="mt-2 w-full p-3 border rounded-xl text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                        placeholder="••••••••"
                    />
                </div>
                <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-2xl text-lg hover:bg-primary/90 transition-all disabled:bg-primary/50" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
};

export default LoginForm;