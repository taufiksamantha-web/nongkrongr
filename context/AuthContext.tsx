
import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';
import { AuthError, Session } from '@supabase/supabase-js';

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

    // Centralized function to validate a session and set the user state.
    const validateAndSetUser = async (session: Session | null) => {
        if (session?.user) {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            // If the profile doesn't exist or there's an error, the session is invalid.
            if (error || !profile) {
                console.error("Invalid session: Profile not found or error fetching. Forcing logout.", error);
                // Force sign out to clear the corrupted session from storage.
                // This will trigger onAuthStateChange again with a SIGNED_OUT event.
                await supabase.auth.signOut();
                setCurrentUser(null);
            } else {
                setCurrentUser(profile as User);
            }
        } else {
            // No session, so no user.
            setCurrentUser(null);
        }
    };

    useEffect(() => {
        setLoading(true);

        // 1. Perform an explicit session check on initial application load.
        supabase.auth.getSession().then(({ data: { session } }) => {
            // Validate whatever session we found (or didn't find).
            validateAndSetUser(session).finally(() => {
                // IMPORTANT: Ensure loading is set to false only after the initial check is complete.
                // This prevents race conditions where the app might render before the user profile is fetched.
                setLoading(false);
            });
        });

        // 2. Set up a listener for any subsequent auth events (login, logout, token refresh).
        // CATATAN: Listener ini sangat penting untuk keamanan.
        // Ketika token sesi pengguna kedaluwarsa, Supabase akan mencoba memperbaruinya di latar belakang.
        // Jika pembaruan gagal (misalnya karena masalah jaringan, atau sesi pengguna dicabut di server),
        // Supabase akan memicu event 'SIGNED_OUT'. Listener ini menangkap event tersebut,
        // memanggil validateAndSetUser(null), yang akan mengatur currentUser menjadi null.
        // Ini secara otomatis dan aman mengeluarkan pengguna dari sistem, memenuhi permintaan untuk
        // "menampilkan kembali panel login setelah terlalu lama tidak aktif". Ini adalah perilaku yang diharapkan.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                // Re-validate the user whenever the auth state changes.
                // We don't manage the `loading` state here to avoid screen flashes during
                // background token refreshes. The initial `loading` screen handles the first-load experience.
                await validateAndSetUser(session);
            }
        );

        // Cleanup the subscription when the component unmounts.
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
            {/* Render children only after the initial auth check is complete. */}
            {children}
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
