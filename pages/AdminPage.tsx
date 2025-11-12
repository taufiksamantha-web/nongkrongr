import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/admin/LoginForm';
import AdminDashboard from '../components/admin/AdminDashboard';
import UserDashboard from '../components/admin/UserDashboard';

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const AdminPage: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        const { error } = await logout();
        if (error) {
            console.error('Logout error:', error.message);
            alert(`Logout error: ${error.message}`);
            setIsLoggingOut(false);
            // Optionally force reload even on error to clear state
            window.location.reload();
        } else {
            // Using window.location.href is a robust way to ensure a full redirect
            // and page reload, clearing all application state.
            window.location.href = '/';
        }
    };
    
    if (!currentUser) {
        return <LoginForm />;
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                <div>
                    <h2 className="text-xl">Welcome, <span className="font-bold text-primary">{currentUser.username}</span></h2>
                    <p className="text-gray-500">You are logged in as: <span className="font-semibold">{currentUser.role.toUpperCase()}</span></p>
                </div>
                <button 
                    onClick={handleLogout} 
                    className="flex items-center justify-center gap-2 bg-accent-pink text-white font-bold py-2 px-6 rounded-2xl hover:bg-accent-pink/90 transition-all disabled:opacity-75"
                    disabled={isLoggingOut}
                >
                    {isLoggingOut && <LoadingSpinner />}
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
            </div>
            
            {currentUser.role === 'admin' ? <AdminDashboard /> : <UserDashboard />}
        </div>
    );
};

export default AdminPage;
