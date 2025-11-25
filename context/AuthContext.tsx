
import React, { createContext, useState, ReactNode, useContext, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';
import { AuthError, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    isLoggingOut: boolean; // State global untuk animasi logout
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
    const queryClient = useQueryClient(); // Akses ke React Query Cache

    // 1. INITIALIZE STATE FROM CACHE (Instant Load - Optimistic UI)
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

    // 2. Loading Strategy
    const [loading, setLoading] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return !localStorage.getItem(USER_STORAGE_KEY);
        }
        return true;
    });

    // 3. Global Logout State
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const fetchUserAndSetState = useCallback(async (session: Session | null): Promise<void> => {
        if (!session?.user) {
            if (currentUserRef.current !== null) {
                setCurrentUser(null);
                localStorage.removeItem(USER_STORAGE_KEY);
            }
            setLoading(false);
            return;
        }
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !profile) {
            console.error("Error fetching profile:", error);
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
        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchUserAndSetState(session);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (isSigningUpRef.current && event === 'SIGNED_IN') {
                    return;
                }

                if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
                    fetchUserAndSetState(session);
                } else if (event === 'SIGNED_OUT') {
                    // Note: We handle state clearing in the logout() function for better UX
                    // ensuring animation plays before state is nuked.
                    if (!isLoggingOut) {
                         // Case: Token expired or remote logout
                         setCurrentUser(null);
                         localStorage.removeItem(USER_STORAGE_KEY);
                         setLoading(false);
                    }
                }
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [fetchUserAndSetState, isLoggingOut]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                supabase.auth.getSession().then(({ data }) => {
                    if (data.session) {
                        fetchUserAndSetState(data.session);
                    } else {
                        if (currentUserRef.current) {
                            setCurrentUser(null);
                            localStorage.removeItem(USER_STORAGE_KEY);
                        }
                    }
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [fetchUserAndSetState]);


    const login = async (identifier: string, password: string) => {
        let emailToLogin = identifier.trim();
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
        isSigningUpRef.current = true;
        const safeUsername = username.trim().toLowerCase().replace(/\s/g, '');
        const safeEmail = email.trim().toLowerCase();

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

        const { data, error } = await supabase.auth.signUp({
            email: safeEmail,
            password,
            options: {
                data: { username: safeUsername, role, status }
            }
        });

        if (error) {
            isSigningUpRef.current = false;
            return { error };
        }
        
        await supabase.auth.signOut();
        
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

        if (error) return { error };

        if (data) {
            const updatedUser = data as User;
            setCurrentUser(updatedUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        }
        
        return { error: null };
    };

    // --- POWERFUL LOGOUT ---
    const logout = async () => {
        setIsLoggingOut(true); // Trigger UI animation

        // Artificial delay to let the animation play smoothly
        await new Promise(resolve => setTimeout(resolve, 1200));

        try {
            // 1. Clear React Query Cache (Removes sensitive/stale data from memory)
            queryClient.clear();

            // 2. Clear Local Storage (Except Theme & Welcome Status)
            const theme = localStorage.getItem('theme'); // Preserve theme preference
            const installDismissed = localStorage.getItem('nongkrongr_install_dismissed'); // Preserve install prompt state
            
            localStorage.clear(); // Wipe everything
            sessionStorage.clear(); // Wipe session

            // Restore non-auth preferences
            if (theme) localStorage.setItem('theme', theme);
            if (installDismissed) localStorage.setItem('nongkrongr_install_dismissed', installDismissed);
            
            // PENTING: Set welcome seen ke true.
            // User yang logout pasti sudah pernah lihat welcome screen, jadi jangan tampilkan lagi.
            localStorage.setItem('nongkrongr_welcome_seen', 'true');

            // 3. Supabase Signout (Revoke Token)
            const { error } = await supabase.auth.signOut();
            
            // 4. Reset Internal State
            setCurrentUser(null);
            
            return { error };
        } catch (e: any) {
            console.error("Logout cleanup failed", e);
            return { error: e };
        } finally {
            setIsLoggingOut(false);
        }
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
        isLoggingOut,
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
