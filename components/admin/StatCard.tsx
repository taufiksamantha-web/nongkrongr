import React from 'react';

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
    const colorClasses = {
        primary: {
            bg: 'bg-primary/10 dark:bg-primary/20',
            text: 'text-primary'
        },
        green: {
            bg: 'bg-green-100 dark:bg-green-500/20',
            text: 'text-green-600 dark:text-green-400'
        },
        red: {
            bg: 'bg-red-100 dark:bg-red-500/20',
            text: 'text-red-600 dark:text-red-400'
        }
    };

    const selectedColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.primary;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm flex items-center space-x-4">
            <div className={`p-4 rounded-2xl ${selectedColor.bg}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">{title}</p>
                <p className={`text-3xl font-bold font-jakarta ${selectedColor.text}`}>{value}</p>
            </div>
        </div>
    );
};

export default StatCard;
