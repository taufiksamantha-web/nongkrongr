
import React, { createContext, useState, ReactNode, useContext, useEffect, useCallback, useRef } from 'react';
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

const USER_STORAGE_KEY = 'nongkrongr_user_profile';

const FullScreenLoader: React.FC = () => (
    <div className="fixed inset-0 bg-soft flex flex-col items-center justify-center z-[2000]">
        <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-16 w-auto mb-6" />
        <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-brand"></div>
        <p className="mt-6 text-muted font-semibold">Memeriksa Sesi...</p>
    </div>
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. INITIALIZE STATE FROM CACHE (Instant Load)
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(USER_STORAGE_KEY);
            try {
                return cached ? JSON.parse(cached) : null;
            } catch (e) {
                return null;
            }
        }
        return null;
    });

    // Keep a ref to access current value inside useCallback without adding to dependency array
    const currentUserRef = useRef(currentUser);
    useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

    // 2. Loading is only true if we have NO cache and are waiting for initial check
    const [loading, setLoading] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return !localStorage.getItem(USER_STORAGE_KEY);
        }
        return true;
    });

    const fetchUserAndSetState = useCallback(async (session: Session | null): Promise<void> => {
        if (!session?.user) {
            if (currentUserRef.current !== null) {
                setCurrentUser(null);
                localStorage.removeItem(USER_STORAGE_KEY);
            }
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
            localStorage.removeItem(USER_STORAGE_KEY);
        } else if (profile.status === 'rejected') {
             // CASE: Admin rejected the manager application
             console.warn("User login attempted but status is rejected.");
             await supabase.auth.signOut();
             setCurrentUser(null);
             localStorage.removeItem(USER_STORAGE_KEY);
        } else if (profile.status === 'archived') {
             // CASE: Account archived (soft deleted)
             console.warn("User login attempted but status is archived.");
             await supabase.auth.signOut();
             setCurrentUser(null);
             localStorage.removeItem(USER_STORAGE_KEY);
        } else {
            // All good - Update State only if data changed to prevent flicker/re-renders
            const userData = profile as User;
            const currentStr = JSON.stringify(currentUserRef.current);
            const newStr = JSON.stringify(userData);
            
            if (currentStr !== newStr) {
                setCurrentUser(userData);
                localStorage.setItem(USER_STORAGE_KEY, newStr);
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        // Initial session check (Background if cache exists)
        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchUserAndSetState(session);
        });

        // Listener for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                    fetchUserAndSetState(session);
                } else if (event === 'SIGNED_OUT') {
                    setCurrentUser(null);
                    localStorage.removeItem(USER_STORAGE_KEY);
                    setLoading(false);
                }
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
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
                await supabase.auth.signOut();
                return { error: new AuthError("Akun Anda telah dihapus oleh Admin.") };
            }

            if (profile.status === 'rejected') {
                await supabase.auth.signOut();
                return { error: new AuthError("Pendaftaran akun Anda ditolak oleh Admin.") };
            }

            if (profile.status === 'archived') {
                await supabase.auth.signOut();
                return { error: new AuthError("Akun ini telah diarsipkan. Hubungi admin untuk memulihkan.") };
            }
        }

        return { error: null };
    };

    const signup = async (username: string, email: string, password: string, isCafeAdmin: boolean = false) => {
        // 1. Pre-check Username Uniqueness
        const { count: usernameCount, error: userCheckError } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('username', username);
        
        if (userCheckError) {
             return { error: new AuthError("Gagal memvalidasi username. Silakan coba lagi.") };
        }
        if (usernameCount !== null && usernameCount > 0) {
            return { error: new AuthError("Username sudah digunakan. Silakan pilih yang lain.") };
        }

        // 2. Pre-check Email Uniqueness
        const { count: emailCount } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('email', email);

        if (emailCount !== null && emailCount > 0) {
            return { error: new AuthError("Email sudah terdaftar. Silakan login.") };
        }

        // 3. Proceed with Auth Signup
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

        // 4. Create Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: signUpData.user.id, username, email, role, status });
        
        if (profileError) {
            console.error("Critical: Failed to create user profile after signup.", profileError);
            return { error: new AuthError(profileError.message) };
        }

        // 5. FORCE LOGOUT to prevent auto-login/redirect
        await supabase.auth.signOut();
        
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
            const updatedUser = data as User;
            setCurrentUser(updatedUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        }
        
        return { error: null };
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        setCurrentUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);

        if (error) {
            // Ignore session missing errors on logout
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
