import React from 'react';

interface StatChartProps {
  sponsored: number;
  regular: number;
  total: number;
}

const StatChart: React.FC<StatChartProps> = ({ sponsored, regular, total }) => {
  if (total === 0) return null;

  const sponsoredPercent = (sponsored / total) * 100;
  const regularPercent = (regular / total) * 100;

  return (
    <div>
      <h3 className="text-xl font-bold font-jakarta mb-4">Distribusi Kafe</h3>
      <div className="w-full bg-soft dark:bg-gray-700/50 rounded-full h-8 flex overflow-hidden border border-border">
        <div
          className="bg-green-500 h-full flex items-center justify-center text-white font-bold text-sm transition-all duration-500"
          style={{ width: `${sponsoredPercent}%` }}
          title={`Sponsored: ${sponsored}`}
        >
          {sponsoredPercent > 10 && <span>{sponsored}</span>}
        </div>
        <div
          className="bg-red-500 h-full flex items-center justify-center text-white font-bold text-sm transition-all duration-500"
          style={{ width: `${regularPercent}%` }}
          title={`Regular: ${regular}`}
        >
          {regularPercent > 10 && <span>{regular}</span>}
        </div>
      </div>
      <div className="flex justify-between text-sm mt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="font-semibold text-primary dark:text-gray-300">Sponsored ({sponsoredPercent.toFixed(1)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="font-semibold text-primary dark:text-gray-300">Regular ({regularPercent.toFixed(1)}%)</span>
        </div>
      </div>
    </div>
  );
};

export default StatChart;