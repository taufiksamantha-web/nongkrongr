import React from 'react';

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
    const colorClasses = {
        brand: 'text-brand',
        green: 'text-green-500',
        red: 'text-red-500'
    };

    const selectedColorClass = colorClasses[color as keyof typeof colorClasses] || 'text-brand';

    return (
        <div className="bg-soft dark:bg-gray-700/50 p-4 rounded-2xl flex items-center space-x-4 border border-border">
            <div className="flex-shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-sm text-muted font-semibold">{title}</p>
                <p className={`text-3xl font-bold font-jakarta ${selectedColorClass}`}>{value}</p>
            </div>
        </div>
    );
};

export default StatCard;