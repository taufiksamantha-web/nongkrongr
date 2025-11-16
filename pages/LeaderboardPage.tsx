import React, { useContext, useMemo } from 'react';
import { CafeContext } from '../context/CafeContext';
import { TrophyIcon, ChatBubbleLeftRightIcon, HandThumbUpIcon } from '@heroicons/react/24/solid';

interface LeaderboardEntry {
    author: string;
    totalHelpful: number;
    reviewCount: number;
}

const LeaderboardPage: React.FC = () => {
    const { cafes, loading } = useContext(CafeContext)!;

    const leaderboardData = useMemo<LeaderboardEntry[]>(() => {
        if (!cafes || cafes.length === 0) {
            return [];
        }

        const allReviews = cafes.flatMap(cafe => cafe.reviews);
        const authorStats: { [author: string]: { totalHelpful: number; reviewCount: number } } = {};

        allReviews.forEach(review => {
            if (!authorStats[review.author]) {
                authorStats[review.author] = { totalHelpful: 0, reviewCount: 0 };
            }
            authorStats[review.author].totalHelpful += review.helpful_count || 0;
            authorStats[review.author].reviewCount += 1;
        });

        const sortedAuthors = Object.entries(authorStats)
            .map(([author, stats]) => ({
                author,
                ...stats,
            }))
            .sort((a, b) => b.totalHelpful - a.totalHelpful);

        return sortedAuthors.slice(0, 20); // Tampilkan top 20
    }, [cafes]);

    return (
        <div className="container mx-auto px-6 py-12">
            <div className="text-center mb-12">
                <TrophyIcon className="h-16 w-16 mx-auto text-accent-amber mb-4" />
                <h1 className="text-4xl md:text-5xl font-extrabold font-jakarta text-primary dark:text-white">
                    Papan Peringkat Reviewer
                </h1>
                <p className="mt-4 text-lg text-muted max-w-2xl mx-auto">
                    Apresiasi untuk para kontributor yang telah memberikan ulasan paling bermanfaat bagi komunitas Nongkrongr.
                </p>
            </div>
            
            {loading ? (
                <div className="space-y-4 max-w-2xl mx-auto">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-card p-4 rounded-2xl animate-pulse flex items-center gap-4">
                           <div className="h-12 w-12 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                           <div className="flex-1 space-y-2">
                               <div className="h-5 w-3/4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                               <div className="h-4 w-1/2 bg-gray-300 dark:bg-gray-700 rounded"></div>
                           </div>
                           <div className="h-8 w-16 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                        </div>
                    ))}
                </div>
            ) : leaderboardData.length > 0 ? (
                 <div className="max-w-2xl mx-auto">
                    <div className="space-y-4">
                        {leaderboardData.map((entry, index) => (
                            <div
                                key={entry.author}
                                className="bg-card border border-border p-4 rounded-2xl shadow-sm flex items-center gap-4 animate-fade-in-up"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-soft dark:bg-gray-700 rounded-full font-bold text-xl text-brand">
                                    {index + 1}
                                </div>
                                <div className="flex-grow">
                                    <p className="font-bold text-lg text-primary dark:text-white">{entry.author}</p>
                                    <div className="flex items-center gap-4 text-sm text-muted">
                                        <div className="flex items-center gap-1">
                                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                            <span>{entry.reviewCount} ulasan</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-2 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 px-3 py-1 rounded-lg font-bold">
                                    <HandThumbUpIcon className="h-5 w-5" />
                                    <span>{entry.totalHelpful}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-10 bg-card rounded-3xl border border-border">
                    <p className="mt-4 text-xl font-bold font-jakarta">Papan Peringkat Masih Kosong</p>
                    <p className="text-muted mt-2 max-w-xs mx-auto">Jadilah yang pertama memberikan ulasan bermanfaat dan dapatkan tempatmu di sini!</p>
                </div>
            )}
        </div>
    );
};

export default LeaderboardPage;