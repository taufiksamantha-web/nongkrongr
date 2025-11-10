import React, { useContext } from 'react';
import { CafeContext } from '../../context/CafeContext';

const UserDashboard: React.FC = () => {
    const { cafes, loading } = useContext(CafeContext)!;

    return (
        <div>
            <h1 className="text-4xl font-bold font-jakarta mb-6">Daftar Cafe</h1>
            {loading ? <p>Loading cafes...</p> : (
                <div className="bg-white dark:bg-gray-800 p-2 rounded-3xl shadow-sm overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-gray-100 dark:border-gray-700">
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Logo</th>
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Cafe</th>
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alamat</th>
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vibes</th>
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fasilitas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cafes.map(cafe => (
                                <tr key={cafe.id} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="p-4">
                                        <img src={cafe.logoUrl || cafe.coverUrl} alt={cafe.name} className="h-12 w-12 object-cover rounded-lg bg-gray-100 dark:bg-gray-700 p-1" />
                                    </td>
                                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">{cafe.name}</td>
                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{cafe.address}</td>
                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                                        {cafe.vibes.map(v => v.name).join(', ')}
                                    </td>
                                    <td className="p-4 text-lg text-gray-600 dark:text-gray-400">
                                        {cafe.amenities.map(a => a.icon).join(' ')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
