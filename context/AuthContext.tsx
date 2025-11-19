
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
    updateUserProfile: (updates: Partial<User>) => Promise<{ error: AuthError | null }>;
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

        // Fetch profile to validate account status
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !profile) {
            // CASE: Admin deleted the user from 'profiles' table
            console.error("Session validation failed. User profile deleted.", { error });
            await supabase.auth.signOut();
            setCurrentUser(null);
        } else if (profile.status === 'rejected') {
             // CASE: Admin rejected the manager application
             console.warn("User login attempted but status is rejected.");
             await supabase.auth.signOut();
             setCurrentUser(null);
        } else if (profile.status === 'archived') {
             // CASE: Account archived (soft deleted)
             console.warn("User login attempted but status is archived.");
             await supabase.auth.signOut();
             setCurrentUser(null);
        } else {
            // All good
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
                if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                    fetchUserAndSetState(session);
                }
            }
        );
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
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
                return { error: new AuthError("Username/email atau password salah.") };
            }
            emailToLogin = profile.email;
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email: emailToLogin, password });
        
        if (error) {
            if (error.message === 'Invalid login credentials') {
                return { error: new AuthError("Username/email atau password salah.") };
            }
            return { error };
        }

        // Post-Login Validation: Check Profile Status
        if (data.user) {
            const { data: profile, error: profileFetchError } = await supabase
                .from('profiles')
                .select('status')
                .eq('id', data.user.id)
                .single();
            
            if (profileFetchError || !profile) {
                // User authenticated but profile is gone (Deleted by Admin)
                await supabase.auth.signOut();
                return { error: new AuthError("Akun Anda telah dihapus oleh Admin.") };
            }

            if (profile.status === 'rejected') {
                // User authenticated but status is rejected
                await supabase.auth.signOut();
                return { error: new AuthError("Pendaftaran akun Anda ditolak oleh Admin.") };
            }

            if (profile.status === 'archived') {
                // User authenticated but status is archived
                await supabase.auth.signOut();
                return { error: new AuthError("Akun ini telah diarsipkan. Hubungi admin untuk memulihkan.") };
            }
        }

        return { error: null };
    };

    const signup = async (username: string, email: string, password: string, isCafeAdmin: boolean = false) => {
        // 1. Pre-check Username Uniqueness
        const { count, error: checkError } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('username', username);
        
        if (checkError) {
             return { error: new AuthError("Gagal memvalidasi username. Silakan coba lagi.") };
        }
        
        if (count !== null && count > 0) {
            return { error: new AuthError("Username sudah digunakan. Silakan pilih yang lain.") };
        }

        // 2. Proceed with Auth Signup
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

        // 3. Create Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: signUpData.user.id, username, email, role, status });
        
        if (profileError) {
            console.error("Critical: Failed to create user profile after signup.", profileError);
            return { error: new AuthError(profileError.message) };
        }

        // 4. FORCE LOGOUT to prevent auto-login
        // This ensures the user sees the "Success" message and has to login manually.
        // If session was created (auto-confirm enabled in Supabase), we kill it here.
        if (signUpData.session) {
            await supabase.auth.signOut();
        }
        
        return { error: null };
    };
    
    const updateUserProfile = async (updates: Partial<User>) => {
        if (!currentUser) return { error: new AuthError("No user is logged in") };
        
        const { id, role, status, ...updateData } = updates;

        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', currentUser.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating user profile:', error);
            return { error };
        }

        if (data) {
            setCurrentUser(data as User);
        }
        
        return { error: null };
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        setCurrentUser(null);

        if (error) {
            const isSessionError = 
                error.message.includes('Auth session missing') || 
                error.message.includes('session_not_found') ||
                error.status === 401 ||
                error.status === 403;
            
            if (isSessionError) {
                return { error: null };
            }
        }
        
        return { error };
    };

    const value = {
        currentUser,
        loading,
        login,
        signup,
        logout,
        updateUserProfile,
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
