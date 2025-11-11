import React from 'react';
import CafeManagementPanel from './CafeManagementPanel';

const UserDashboard: React.FC = () => {
    return (
        <div>
            <h1 className="text-4xl font-bold font-jakarta mb-6">Manajemen Cafe</h1>
            <p className="mb-6 text-muted">
                Di sini kamu bisa menambahkan cafe baru atau mengedit informasi cafe yang sudah ada untuk membantu sesama penikmat kopi.
            </p>
            <div className="bg-card p-6 rounded-3xl shadow-sm border border-border">
                <CafeManagementPanel />
            </div>
        </div>
    );
};

export default UserDashboard;