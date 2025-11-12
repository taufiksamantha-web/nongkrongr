
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

      let filteredCafes = [...cafes];

      // Filter by vibes
      if (params.vibes && params.vibes.length > 0) {
        filteredCafes = filteredCafes.filter(cafe =>
          params.vibes.every(vibeId => cafe.vibes.some(v => v.id === vibeId))
        );
      }

      // Filter by amenities
      if (params.amenities && params.amenities.length > 0) {
        filteredCafes = filteredCafes.filter(cafe =>
          params.amenities.every(amenityId => cafe.amenities.some(a => a.id === amenityId))
        );
      }

      // Filter by price
      if (params.maxPriceTier) {
        filteredCafes = filteredCafes.filter(cafe => cafe.priceTier <= params.maxPriceTier);
      }
      
      // Sort results
      if (params.sortBy) {
        switch (params.sortBy) {
          case 'work':
            filteredCafes.sort((a, b) => b.avgWorkScore - a.avgWorkScore);
            break;
          case 'quiet':
            // sort by evening crowd, ascending
            filteredCafes.sort((a, b) => a.avgCrowdEvening - b.avgCrowdEvening);
            break;
          case 'aesthetic':
          default:
            filteredCafes.sort((a, b) => b.avgAestheticScore - a.avgAestheticScore);
            break;
        }
      }

      setResults(filteredCafes.slice(0, 6)); // Show top 6 results
    } catch (e) {
      console.error(e);
      setError('Maaf, terjadi kesalahan saat mencari rekomendasi. Coba lagi ya.');
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
