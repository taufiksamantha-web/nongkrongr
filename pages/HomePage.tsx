import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cafe, Review } from '../types';
import { VIBES } from '../constants';
import { cafeService } from '../services/cafeService';
import CafeCard from '../components/CafeCard';
import FeaturedCafeCard from '../components/FeaturedCafeCard';
import ReviewCard from '../components/ReviewCard';

type TopReview = Review & { cafeName: string; cafeSlug: string };

const HomePage: React.FC = () => {
  const [trendingCafes, setTrendingCafes] = useState<Cafe[]>([]);
  const [recommendedCafe, setRecommendedCafe] = useState<Cafe | null>(null);
  const [topReviews, setTopReviews] = useState<TopReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCafes = async () => {
      setLoading(true);
      const allCafes = await cafeService.getCafes();
      
      // Trending cafes based on aesthetic score
      const sortedByAesthetic = [...allCafes].sort((a, b) => b.avgAestheticScore - a.avgAestheticScore);
      setTrendingCafes(sortedByAesthetic.slice(0, 4));

      // Dynamic Recommendation Logic
      const calculateRecommendationScore = (cafe: Cafe): number => {
        if (cafe.reviews.filter(r => r.status === 'approved').length === 0) {
            return 0;
        }
        let score = (cafe.avgAestheticScore + cafe.avgWorkScore) / 2;
        if (cafe.spots.length > 0) score += 1.5;
        if (cafe.reviews.length > 3) score += 1.0;
        if (cafe.amenities.length >= 5) score += 0.5;
        if (cafe.isSponsored) {
            score += 10 - (cafe.sponsoredRank * 0.5);
        }
        return score;
      };

      const recommended = allCafes
        .map(cafe => ({ cafe, score: calculateRecommendationScore(cafe) }))
        .sort((a, b) => b.score - a.score);

      if (recommended.length > 0 && recommended[0].score > 0) {
        setRecommendedCafe(recommended[0].cafe);
      } else if (allCafes.length > 0) {
        setRecommendedCafe(sortedByAesthetic[0]);
      }

      // --- New Top Reviews Logic ---
      const allApprovedReviews = allCafes.flatMap(cafe =>
        cafe.reviews
          .filter(review => review.status === 'approved' && review.text.length > 20)
          .map(review => ({
            ...review,
            cafeName: cafe.name,
            cafeSlug: cafe.slug,
          }))
      );
      
      allApprovedReviews.sort((a, b) => {
        const scoreA = a.ratingAesthetic + a.ratingWork;
        const scoreB = b.ratingAesthetic + b.ratingWork;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setTopReviews(allApprovedReviews.slice(0, 4));
      // --- End of Top Reviews Logic ---

      setLoading(false);
    };
    fetchCafes();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold font-jakarta bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-pink leading-snug">
          Temukan Spot Nongkrong
          <br />
          Estetikmu
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Jelajahi cafe-cafe paling hits dan instagramable di Palembang. Dari tempat nugas super cozy sampai spot foto OOTD terbaik.
        </p>
        <div className="mt-8 max-w-xl mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari cafe di Palembang..."
              className="w-full py-4 px-6 text-lg rounded-2xl border-2 border-gray-200 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-white px-6 py-2 rounded-2xl font-bold hover:bg-primary/90 transition-all duration-300">
              Cari
            </button>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {VIBES.slice(0, 4).map(vibe => (
                <Link to={`/explore?vibe=${vibe.id}`} key={vibe.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-2xl text-gray-700 dark:text-gray-300 hover:bg-primary hover:text-white hover:border-primary dark:hover:border-primary transition-all duration-300 font-semibold">
                    {vibe.name}
                </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Section */}
      <div className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold font-jakarta text-center mb-2">Pilihan Editor Minggu Ini</h2>
           <p className="text-center text-gray-500 dark:text-gray-400 mb-10">Cafe yang wajib banget kamu datengin sekarang!</p>
          {loading ? (
            <div className="bg-gray-200 dark:bg-gray-800 h-72 rounded-4xl animate-pulse max-w-4xl mx-auto"></div>
          ) : recommendedCafe ? (
            <FeaturedCafeCard cafe={recommendedCafe} />
          ) : null}
        </div>
      </div>


      {/* Trending Section */}
      <div className="bg-primary/5 dark:bg-primary/10 py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold font-jakarta text-center mb-2">Lagi Trending Nih!</h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-10">Cafe dengan skor aesthetic tertinggi pilihan warga Nongkrongr.</p>
          {loading ? (
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-200 dark:bg-gray-800 h-80 rounded-3xl animate-pulse"></div>)}
             </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {trendingCafes.map(cafe => (
                <CafeCard key={cafe.id} cafe={cafe} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Top Reviews Section */}
      <div className="py-16">
        <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold font-jakarta text-center mb-2">Kata Mereka Tentang Cafe Hits</h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-10">Review teratas dari para penjelajah cafe di Palembang.</p>
             {loading ? (
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-200 dark:bg-gray-800 h-64 rounded-3xl animate-pulse"></div>)}
             </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {topReviews.map(review => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;