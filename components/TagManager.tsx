import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Cafe, Tag } from '../types';
import { useAuth } from '../context/AuthContext';
import { CafeContext } from '../context/CafeContext';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/solid';

interface TagManagerProps {
    cafe: Cafe;
    setNotification: (notification: { message: string; type: 'success' | 'error' } | null) => void;
}

const TagManager: React.FC<TagManagerProps> = ({ cafe, setNotification }) => {
    const { currentUser } = useAuth();
    const { getAllTags, addTagToCafe, removeTagFromCafe } = useContext(CafeContext)!;
    
    const [inputValue, setInputValue] = useState('');
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [suggestions, setSuggestions] = useState<Tag[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchTags = async () => {
            const tagsData = await getAllTags();
            setAllTags(tagsData);
        };
        fetchTags();
    }, [getAllTags]);
    
    useEffect(() => {
        if (inputValue.length > 1) {
            const currentTagNames = new Set(cafe.tags.map(t => t.name));
            const filtered = allTags.filter(tag => 
                tag.name.toLowerCase().includes(inputValue.toLowerCase()) && !currentTagNames.has(tag.name)
            );
            setSuggestions(filtered.slice(0, 5));
        } else {
            setSuggestions([]);
        }
    }, [inputValue, allTags, cafe.tags]);

    const normalizeTag = (name: string) => {
        return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    const handleAddTag = async (tagName: string) => {
        const normalizedTag = normalizeTag(tagName);
        if (!normalizedTag) return;
        if (cafe.tags.some(t => t.name === normalizedTag)) {
            setNotification({ message: 'Tag ini sudah ada di kafe.', type: 'error' });
            return;
        }

        setIsLoading(true);
        setInputValue('');
        setSuggestions([]);

        const { error } = await addTagToCafe(cafe.id, normalizedTag);
        if (error) {
            setNotification({ message: `Gagal menambahkan tag: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: `Tag #${normalizedTag} berhasil ditambahkan!`, type: 'success' });
        }
        setIsLoading(false);
    };

    const handleRemoveTag = async (tagId: string) => {
        setIsLoading(true);
        const { error } = await removeTagFromCafe(cafe.id, tagId);
        if (error) {
            setNotification({ message: `Gagal menghapus tag: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: 'Tag berhasil dihapus.', type: 'success' });
        }
        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            handleAddTag(inputValue);
        }
    };
    
    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {cafe.tags.map(tag => (
                    <div key={tag.id} className="flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-full">
                        <span className="px-3 py-1 text-sm font-semibold text-primary dark:text-gray-300">
                           #{tag.name}
                        </span>
                         {currentUser && (
                            <button
                                onClick={() => handleRemoveTag(tag.id)}
                                disabled={isLoading}
                                className="pr-2 text-muted hover:text-accent-pink disabled:text-gray-400"
                                aria-label={`Hapus tag ${tag.name}`}
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}
                 {cafe.tags.length === 0 && (
                    <p className="text-sm text-muted">Belum ada tag dari komunitas. Jadilah yang pertama!</p>
                )}
            </div>

            {currentUser && (
                <div className="mt-6 relative">
                    <div className="relative">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Tambah tag (e.g., KidsFriendly, MeetingSpot)"
                            className="w-full p-3 pr-14 sm:pr-28 border-2 border-border bg-soft rounded-xl text-primary dark:bg-gray-700/50 focus:ring-2 focus:ring-brand transition-all"
                            disabled={isLoading}
                        />
                         <button
                            onClick={() => handleAddTag(inputValue)}
                            disabled={isLoading || !inputValue.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center bg-brand text-white font-bold h-10 rounded-lg hover:bg-brand/90 transition-all disabled:bg-brand/50 w-10 sm:w-auto sm:px-4 sm:gap-1"
                            aria-label="Tambah Tag"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span className="hidden sm:inline">Tambah</span>
                        </button>
                    </div>

                    {suggestions.length > 0 && (
                        <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg z-10">
                            <p className="px-3 py-2 text-xs font-semibold text-muted">Saran tag:</p>
                            <ul>
                                {suggestions.map(tag => (
                                    <li key={tag.id}>
                                        <button 
                                            onClick={() => handleAddTag(tag.name)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-soft dark:hover:bg-gray-700/50"
                                        >
                                            #{tag.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TagManager;