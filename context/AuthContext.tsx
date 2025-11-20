
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
    resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>;
    updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
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

    const currentUserRef = useRef(currentUser);
    useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

    // Ref to prevent auto-login redirect loop during signup
    const isSigningUpRef = useRef(false);

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
            // Profile missing or error, let UI handle state
        } else if (profile.status === 'rejected') {
             await supabase.auth.signOut();
             setCurrentUser(null);
             localStorage.removeItem(USER_STORAGE_KEY);
        } else if (profile.status === 'archived') {
             await supabase.auth.signOut();
             setCurrentUser(null);
             localStorage.removeItem(USER_STORAGE_KEY);
        } else {
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
        // Check Initial Session
        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchUserAndSetState(session);
        });

        // Listen for Auth Changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // CRITICAL: Ignore SIGNED_IN event if we are in the middle of a signup process.
                if (isSigningUpRef.current && event === 'SIGNED_IN') {
                    return;
                }

                if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
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
        // Aggressive trim to prevent whitespace issues
        let emailToLogin = identifier.trim();
        
        // Simple check if it looks like an email
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToLogin);

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
            return { error: new AuthError("Username/email atau password salah.") };
        }

        // Check status immediately after login
        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('status')
                .eq('id', data.user.id)
                .single();
            
            if (profile) {
                if (profile.status === 'rejected') {
                    await supabase.auth.signOut();
                    return { error: new AuthError("Pendaftaran akun Anda ditolak oleh Admin.") };
                }
                if (profile.status === 'archived') {
                    await supabase.auth.signOut();
                    return { error: new AuthError("Akun ini telah diarsipkan.") };
                }
            }
        }

        return { error: null };
    };

    const signup = async (username: string, email: string, password: string, isCafeAdmin: boolean = false) => {
        // Set flag to true to block onAuthStateChange from reacting to the temporary session
        isSigningUpRef.current = true;
        
        // AGGRESSIVE SANITIZATION
        const safeUsername = username.trim().toLowerCase().replace(/\s/g, '');
        const safeEmail = email.trim().toLowerCase();

        // 1. Validasi Username Unik (Frontend Check)
        const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('username', safeUsername);
        
        if (count !== null && count > 0) {
            isSigningUpRef.current = false;
            return { error: new AuthError("Username sudah digunakan. Silakan pilih yang lain.") };
        }

        const role = isCafeAdmin ? 'admin_cafe' : 'user';
        const status = isCafeAdmin ? 'pending_approval' : 'active';

        // 2. Signup Auth dengan Metadata
        const { data, error } = await supabase.auth.signUp({
            email: safeEmail,
            password,
            options: {
                data: {
                    username: safeUsername, // Trigger akan membaca ini
                    role,     // Trigger akan membaca ini
                    status    // Trigger akan membaca ini
                }
            }
        });

        if (error) {
            isSigningUpRef.current = false;
            return { error };
        }
        
        // 3. FORCE LOGOUT IMMEDIATELY
        await supabase.auth.signOut();
        
        // Reset flag after a delay
        setTimeout(() => {
            isSigningUpRef.current = false;
        }, 2000);
        
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
        // 1. Aggressive Local Cleanup
        setCurrentUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem('nongkrongr_guest_read_notifications');
        localStorage.removeItem('nongkrongr_guest_deleted_notifications');
        localStorage.removeItem('nongkrongr_favorites'); 

        // 2. Server SignOut
        const { error } = await supabase.auth.signOut();
        
        return { error };
    };

    const resetPasswordForEmail = async (email: string) => {
        const redirectTo = `${window.location.origin}/#/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
        });
        return { error };
    };

    const updatePassword = async (password: string) => {
        const { error } = await supabase.auth.updateUser({ password });
        return { error };
    };

    const value = {
        currentUser,
        loading,
        login,
        signup,
        logout,
        updateUserProfile,
        resetPasswordForEmail,
        updatePassword,
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
