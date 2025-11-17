import React, { createContext, useState, ReactNode, useContext, useEffect, useCallback } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';
import { AuthError, Session } from '@supabase/supabase-js';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signup: (username: string, email: string, password: string, isCafeAdmin?: boolean) => Promise<{ error: AuthError | null }>;
    logout: () => Promise<{ error: AuthError | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FullScreenLoader: React.FC = () => (
    <div className="fixed inset-0 bg-soft flex flex-col items-center justify-center z-[2000]">
        <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-16 w-auto mb-6" />
        <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-brand"></div>
        <p className="mt-6 text-muted font-semibold">Memeriksa Sesi...</p>
    </div>
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // The listener is the single source of truth for the user's auth state.
        // It fires once on initial load, and again whenever the auth state changes.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                // If there's no session, the user is logged out.
                if (!session) {
                    setCurrentUser(null);
                    setLoading(false); // We are done loading.
                    return;
                }

                // If a session exists, we must validate it by fetching the user's profile.
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error || !profile) {
                    // CRITICAL: The user has a session, but no profile. This is an invalid state.
                    // Force a sign-out to clear the invalid session. The listener will be triggered
                    // again with a null session, which will then correctly set the loading state to false.
                    console.error("Auth state error: User session exists but profile is missing. Forcing sign out.", error);
                    await supabase.auth.signOut();
                } else {
                    // Session and profile are valid. Set the user and stop loading.
                    setCurrentUser(profile as User);
                    setLoading(false);
                }
            }
        );

        return () => {
            // Cleanup subscription on unmount
            subscription?.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const signup = async (username: string, email: string, password: string, isCafeAdmin: boolean = false) => {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signUpError) {
            return { error: signUpError };
        }
        if (!signUpData.user) {
             return { error: new AuthError("Sign up successful, but no user data returned.") };
        }
        
        const role = isCafeAdmin ? 'admin_cafe' : 'user';
        const status = isCafeAdmin ? 'pending_approval' : 'active';

        const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: signUpData.user.id, username, role, status });
        
        if (profileError) {
            console.error("Critical: Failed to create user profile after signup.", profileError);
            return { error: new AuthError(profileError.message) };
        }
        
        return { error: null };
    };

    const logout = async () => {
        // Simply sign out. The onAuthStateChange listener will handle the state update.
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    const value = {
        currentUser,
        loading,
        login,
        signup,
        logout,
    };

    // Render the loader until the initial auth check is complete.
    // The onAuthStateChange listener guarantees to set loading to false.
    if (loading) {
        return <FullScreenLoader />;
    }

    return (
        <AuthContext.Provider value={value}>
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