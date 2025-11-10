import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const LoginForm: React.FC = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = login(username, password);
        if (!success) {
            setError('Username atau password salah.');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg space-y-6">
                <h1 className="text-3xl font-bold font-jakarta text-center">Dashboard Login</h1>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-xl text-center">{error}</p>}
                <div>
                    <label className="font-semibold">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-2 w-full p-3 border rounded-xl text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
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
                    />
                </div>
                <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-2xl text-lg hover:bg-primary/90 transition-all">
                    Login
                </button>
            </form>
        </div>
    );
};

export default LoginForm;
