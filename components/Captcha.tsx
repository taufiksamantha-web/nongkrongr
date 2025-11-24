
import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface CaptchaProps {
  onVerify: (isValid: boolean) => void;
}

const Captcha: React.FC<CaptchaProps> = ({ onVerify }) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const generateProblem = () => {
    setNum1(Math.floor(Math.random() * 10));
    setNum2(Math.floor(Math.random() * 10));
    setUserAnswer('');
    setStatus('idle');
    onVerify(false);
  };

  useEffect(() => {
    generateProblem();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Hanya izinkan angka
    if (val && !/^\d+$/.test(val)) return;

    setUserAnswer(val);
    
    if (val !== '' && parseInt(val) === num1 + num2) {
      setStatus('success');
      onVerify(true);
    } else {
      setStatus(val === '' ? 'idle' : 'error');
      onVerify(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-navy-900 rounded-xl border border-gray-200 dark:border-navy-700">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Verifikasi Keamanan</label>
        <button 
          type="button" 
          onClick={generateProblem} 
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs flex items-center gap-1 transition"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="bg-white dark:bg-navy-800 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-navy-600 font-mono text-lg font-bold tracking-widest select-none text-gray-600 dark:text-gray-300 shadow-sm">
          {num1} + {num2} = ?
        </div>
        <div className="relative flex-1">
            <input 
            type="text" 
            inputMode="numeric" 
            value={userAnswer}
            onChange={handleChange}
            placeholder="Hasil..."
            className={`w-full pl-4 pr-10 py-2.5 rounded-lg border outline-none transition font-medium text-lg
                bg-white dark:bg-navy-900 text-gray-900 dark:text-white
                ${status === 'success' ? 'border-green-500 focus:border-green-500' : 
                  status === 'error' ? 'border-red-300 focus:border-red-500' : 'border-gray-300 dark:border-navy-600 focus:border-blue-500'}
            `}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {status === 'success' && <CheckCircle size={20} className="text-green-600 dark:text-green-500" />}
                {status === 'error' && <XCircle size={20} className="text-red-500 dark:text-red-400" />}
            </div>
        </div>
      </div>
      {status === 'error' && <p className="text-xs text-red-500 mt-1.5 ml-1 font-medium">Hitungan salah, coba lagi.</p>}
    </div>
  );
};

export default Captcha;
