
import React, { createContext, useState, ReactNode, useContext, useEffect, useCallback } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';
import { AuthError, Session } from '@supabase/supabase-js';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    login: (identifier: string, password: string) => Promise<{ error: AuthError | null }>;
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

    const fetchUserAndSetState = useCallback(async (session: Session | null): Promise<void> => {
        if (!session?.user) {
            setCurrentUser(null);
            setLoading(false);
            return;
        }

        // A session exists, now verify we can access protected data (the user's own profile).
        // This is the most reliable way to check if the token is actually valid.
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !profile) {
            // If this fails, the token is likely invalid. Sign out to clear the bad session.
            console.error("Session validation failed. User profile inaccessible. Signing out.", { error });
            await supabase.auth.signOut();
            setCurrentUser(null); // Explicitly set user to null immediately.
        } else {
            // All good.
            setCurrentUser(profile as User);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        setLoading(true);
        // On initial load, get the session and validate it.
        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchUserAndSetState(session);
        });

        // The listener handles subsequent changes like login, logout.
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // We only need to react to explicit sign-in/out events here.
                // The visibility check will handle expired sessions.
                if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                    fetchUserAndSetState(session);
                }
            }
        );
        
        // Set up a periodic check every time the tab becomes visible.
        // This is more robust than a one-time focus event for handling long inactivity.
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // When tab becomes visible, re-validate the session.
                supabase.auth.getSession().then(({ data: { session } }) => {
                   fetchUserAndSetState(session);
                });
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            authListener.subscription.unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchUserAndSetState]);

    const login = async (identifier: string, password: string) => {
        let emailToLogin = identifier;
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

        if (!isEmail) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', identifier)
                .single();

            if (profileError || !profile) {
                console.error("Username lookup failed:", profileError);
                return { error: new AuthError("Username/email atau password salah.") };
            }
            emailToLogin = profile.email;
        }

        const { error } = await supabase.auth.signInWithPassword({ email: emailToLogin, password });
        if (error && error.message === 'Invalid login credentials') {
             return { error: new AuthError("Username/email atau password salah.") };
        }
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
            .insert({ id: signUpData.user.id, username, email, role, status });
        
        if (profileError) {
            console.error("Critical: Failed to create user profile after signup.", profileError);
            // Attempt to delete the auth user if profile creation fails to avoid orphaned auth accounts.
            // This requires admin privileges and is best done in a server environment (e.g., Edge Function).
            // For client-side, this is a best-effort that might fail.
            // await supabase.auth.admin.deleteUser(signUpData.user.id);
            return { error: new AuthError(profileError.message) };
        }
        
        return { error: null };
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        // The onAuthStateChange listener will also set the user to null,
        // but we do it here too for a faster UI response.
        if (!error) {
            setCurrentUser(null);
        }
        return { error };
    };

    const value = {
        currentUser,
        loading,
        login,
        signup,
        logout,
    };

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