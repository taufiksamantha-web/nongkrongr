import React from 'react';
import CafeManagementPanel from './CafeManagementPanel';

const UserDashboard: React.FC = () => {
    return (
        <div>
            <h1 className="text-4xl font-bold font-jakarta mb-6">Manajemen Cafe</h1>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
                Di sini kamu bisa menambahkan cafe baru atau mengedit informasi cafe yang sudah ada untuk membantu sesama penikmat kopi.
            </p>
            <CafeManagementPanel />
        </div>
    );
};

export default UserDashboard;