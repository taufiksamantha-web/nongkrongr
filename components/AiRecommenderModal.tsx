import React, { useState, useContext } from 'react';
import { CafeContext } from '../context/CafeContext';
import { geminiService, AiRecommendationParams } from '../services/geminiService';
import { Cafe } from '../types';
import CafeCard from './CafeCard';
import { XMarkIcon, SparklesIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';

interface AiRecommenderModalProps {
  onClose: () => void;
}

const AiRecommenderModal: React.FC<AiRecommenderModalProps> = ({ onClose }) => {
  const { cafes } = useContext(CafeContext)!;
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Cafe[]>([]);
  const [reasoning, setReasoning] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setResults([]);

    try {
      const params = await geminiService.getCafeRecommendations(prompt);
      setReasoning(params.reasoning);

      // --- NEW: SCORING-BASED RECOMMENDATION LOGIC ---

      // 1. Start with cafes that meet the hard filter (price)
      const candidateCafes = cafes.filter(cafe => cafe.priceTier <= params.maxPriceTier);

      // 2. Score each candidate cafe based on how well it matches vibes and amenities
      const scoredCafes = candidateCafes.map(cafe => {
        let matchScore = 0;
        
        // Award points for matching vibes
        if (params.vibes && params.vibes.length > 0) {
            params.vibes.forEach(vibeId => {
                if (cafe.vibes.some(v => v.id === vibeId)) {
                    matchScore += 1;
                }
            });
        }

        // Award points for matching amenities
        if (params.amenities && params.amenities.length > 0) {
            params.amenities.forEach(amenityId => {
                if (cafe.amenities.some(a => a.id === amenityId)) {
                    matchScore += 1;
                }
            });
        }
        
        return { cafe, matchScore };
      });

      // 3. Sort cafes based on the scores
      scoredCafes.sort((a, b) => {
        // Primary sort: by matchScore in descending order
        if (b.matchScore !== a.matchScore) {
            return b.matchScore - a.matchScore;
        }

        // Secondary sort: by the user's implicit preference (aesthetic, work, quiet)
        const sortBy = params.sortBy || 'aesthetic';
        switch (sortBy) {
            case 'work':
                return b.cafe.avgWorkScore - a.cafe.avgWorkScore;
            case 'quiet':
                // Lower crowd score is better (quieter)
                return a.cafe.avgCrowdEvening - b.cafe.avgCrowdEvening;
            case 'aesthetic':
            default:
                return b.cafe.avgAestheticScore - a.cafe.avgAestheticScore;
        }
      });

      // 4. Set the final results
      setResults(scoredCafes.map(item => item.cafe).slice(0, 6));

    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.message.includes("diinisialisasi")) {
          setError('Fitur AI tidak dapat digunakan karena kunci API belum diatur.');
      } else {
          setError('Maaf, terjadi kesalahan saat mencari rekomendasi. Coba lagi ya.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in-up"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-modal-title"
    >
      <div
        className="bg-card rounded-4xl shadow-2xl w-full max-w-3xl h-[90vh] max-h-[800px] mx-4 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-6 flex justify-between items-center border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-8 w-8 text-brand" />
            <h2 id="ai-modal-title" className="text-2xl font-bold font-jakarta">Asisten AI Nongkrongr</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-soft dark:hover:bg-gray-700" aria-label="Tutup">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </header>

        <main className="p-6 flex-grow overflow-y-auto">
          {!hasSearched && (
            <div className="text-center h-full flex flex-col justify-center items-center">
                <p className="text-6xl mb-4 animate-pulse">✨</p>
                <h3 className="text-2xl font-bold font-jakarta">Mau nongkrong di mana hari ini?</h3>
                <p className="text-muted mt-2 max-w-md">
                    Cukup tulis apa yang kamu mau, biar AI yang carikan tempatnya. <br/>
                    <em className="italic">"Cafe yang sepi buat nugas, ada wifi kenceng, dan kopinya enak tapi jangan mahal-mahal."</em>
                </p>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-10">
              <div className="w-10 h-10 border-4 border-dashed rounded-full animate-spin border-brand mx-auto"></div>
              <p className="mt-4 text-muted font-semibold">AI sedang meracik rekomendasi...</p>
            </div>
          )}

          {!isLoading && hasSearched && (
            <div>
              {reasoning && (
                <div className="bg-brand/10 dark:bg-brand/20 p-4 rounded-2xl mb-6 text-center">
                  <p className="font-semibold text-brand">{reasoning}</p>
                </div>
              )}
              {results.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {results.map((cafe, i) => (
                    <CafeCard key={cafe.id} cafe={cafe} animationDelay={`${i * 75}ms`} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-4xl mb-4">😕</p>
                  <p className="text-xl font-bold font-jakarta">Yah, cafe yang kamu cari belum ada.</p>
                  <p className="text-muted mt-2">Coba ganti kata kuncimu atau kurangi kriteria pencarian ya.</p>
                </div>
              )}
               {error && <p className="text-center text-accent-pink mt-4">{error}</p>}
            </div>
          )}
        </main>

        <footer className="p-6 border-t border-border flex-shrink-0">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); }}}
              placeholder="Tulis keinginanmu di sini..."
              className="w-full p-4 pr-32 text-base rounded-2xl border-2 border-border focus:ring-4 focus:ring-brand/20 focus:border-brand transition-all duration-300 shadow-sm bg-soft text-primary dark:text-white placeholder-muted resize-none"
              rows={2}
              disabled={isLoading}
              aria-label="Masukkan permintaan rekomendasi cafe"
            />
            <button
              onClick={handleSearch}
              disabled={isLoading || !prompt.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-brand text-white px-6 py-2 rounded-2xl font-bold hover:bg-brand/90 transition-all duration-300 disabled:bg-brand/50 disabled:cursor-not-allowed flex items-center gap-2"
              aria-label="Cari rekomendasi"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              Cari
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AiRecommenderModal;