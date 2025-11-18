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
        red: 'text-red-500',
        yellow: 'text-yellow-500',
        purple: 'text-purple-500',
    };

    const selectedColorClass = colorClasses[color as keyof typeof colorClasses] || 'text-brand';

    return (
        <div className="bg-soft dark:bg-gray-700/50 p-4 rounded-2xl border border-border space-y-2 flex flex-col justify-between min-h-[110px]">
            <div className="flex justify-between items-start">
                <p className="text-sm text-muted font-semibold leading-tight">{title}</p>
                {icon}
            </div>
            <p className={`text-3xl font-bold font-jakarta ${selectedColorClass}`}>{value}</p>
        </div>
    );
};

export default StatCard;