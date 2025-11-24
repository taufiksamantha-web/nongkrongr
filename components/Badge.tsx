import React from 'react';
import { NewsStatus } from '../types';

interface BadgeProps {
  status: NewsStatus;
  className?: string; // Allow custom classes
}

const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  let colorClass = '';
  let label = status as string;

  switch (status) {
    case NewsStatus.HOAX:
      colorClass = 'bg-red-600 text-white';
      break;
    case NewsStatus.FAKTA:
      colorClass = 'bg-green-600 text-white';
      break;
    case NewsStatus.DISINFORMASI:
      colorClass = 'bg-yellow-500 text-white';
      break;
    case NewsStatus.HATE_SPEECH:
      colorClass = 'bg-purple-600 text-white';
      break;
    default:
      colorClass = 'bg-gray-500 text-white';
  }

  return (
    <div className={`inline-block ${colorClass} text-[10px] font-extrabold px-3 py-1.5 rounded shadow-md tracking-wider uppercase ${className}`}>
      {label}
    </div>
  );
};

export default Badge;