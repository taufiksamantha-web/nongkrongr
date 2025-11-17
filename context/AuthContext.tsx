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

    const processSession = useCallback(async (session: Session | null) => {
        // If there's no session, we're done. No user, no loading.
        if (!session) {
            setCurrentUser(null);
            setLoading(false);
            return;
        }

        // There is a session, let's try to get the profile.
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        // If there's an error getting the profile, or the profile doesn't exist,
        // we treat this as a "not logged in" state and clean up.
        if (error || !profile) {
            console.error("Auth state error: User session exists but profile is missing. Forcing sign out.", error);
            // Sign out to clear the inconsistent state from Supabase Auth.
            await supabase.auth.signOut();
            // And crucially, update our app's state immediately to unblock the UI.
            setCurrentUser(null);
            setLoading(false);
        } else {
            // Success case: we have a session and a profile.
            setCurrentUser(profile as User);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // onAuthStateChange is the single source of truth. It's called upon initialization
        // and whenever the user signs in, out, or the token is refreshed.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                await processSession(session);
            }
        );

        return () => {
            subscription?.unsubscribe();
        };
    }, [processSession]);

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