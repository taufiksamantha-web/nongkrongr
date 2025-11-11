import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/admin/LoginForm';
import AdminDashboard from '../components/admin/AdminDashboard';
import UserDashboard from '../components/admin/UserDashboard';

const AdminPage: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        const { error } = await logout();
        if (error) {
            console.error('Logout error:', error.message);
            alert('Gagal untuk logout. Silakan coba lagi.');
        } else {
            navigate('/');
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
                <button onClick={handleLogout} className="bg-accent-pink text-white font-bold py-2 px-6 rounded-2xl hover:bg-accent-pink/90 transition-all">
                    Logout
                </button>
            </div>
            
            {currentUser.role === 'admin' ? <AdminDashboard /> : <UserDashboard />}
        </div>
    );
};

export default AdminPage;