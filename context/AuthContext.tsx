import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';
import { AuthError } from '@supabase/supabase-js';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    logout: () => Promise<{ error: AuthError | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                // **Robustness Improvement**:
                // If there's an error fetching the profile OR the profile doesn't exist,
                // it means the session is invalid or the user state is inconsistent.
                // Proactively sign out to clear the bad session from localStorage.
                if (error || !profile) {
                    console.error("Invalid session state: Profile not found or error fetching. Forcing logout.", error);
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                } else {
                    setCurrentUser(profile as User | null);
                }
            } else {
                setCurrentUser(null);
            }
            
            setLoading(false);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    const value = {
        currentUser,
        loading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
