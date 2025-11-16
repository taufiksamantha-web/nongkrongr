
import React from 'react';
import LoginForm from '../components/admin/LoginForm';

const LoginPage: React.FC = () => {
    return (
        <div className="bg-soft min-h-screen font-sans text-primary dark:text-gray-200 flex flex-col justify-center items-center p-4">
            <LoginForm />
        </div>
    );
};

export default LoginPage;
