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
        // Supabase's onAuthStateChange listener fires immediately with the current session.
        // This single listener handles the initial page load, logins, and logouts robustly.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                // If a session exists, fetch the user's profile.
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error("Error fetching profile:", error);
                    setCurrentUser(null); // If profile fetch fails, treat as logged out.
                } else {
                    setCurrentUser(profile as User | null);
                }
            } else {
                // If no session, clear the user.
                setCurrentUser(null);
            }
            
            // The first time this runs, the initial auth check is complete.
            setLoading(false);
        });

        // Clean up the subscription when the component unmounts.
        return () => {
            subscription?.unsubscribe();
        };
    }, []); // Empty dependency array ensures this runs only once on mount.

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        // The onAuthStateChange listener will automatically handle updating the user state.
        return { error };
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        // The onAuthStateChange listener will automatically handle clearing the user state.
        return { error };
    };

    const value = {
        currentUser,
        loading,
        login,
        logout,
    };

    // Render children only after the initial loading is complete.
    // This prevents showing a logged-out state briefly on page load.
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
