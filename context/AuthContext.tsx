import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

// Our app's user type, simplified
interface User {
  id: string;
  email: string | undefined;
  role: string; // In a real app, you'd get this from a 'profiles' table
  username: string;
}

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
              // A simple way to map Supabase user to our app user
              const user = session.user;
              setCurrentUser({
                  id: user.id,
                  email: user.email,
                  // In a real app, you would fetch a 'profiles' table to get the role
                  // For this example, we'll check the email.
                  role: user.email === 'admin@nongkrongr.com' ? 'admin' : 'user',
                  username: user.email?.split('@')[0] || 'User'
              });
          }
          setLoading(false);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const user = session?.user;
            if (user) {
                 setCurrentUser({
                    id: user.id,
                    email: user.email,
                    role: user.email === 'admin@nongkrongr.com' ? 'admin' : 'user',
                    username: user.email?.split('@')[0] || 'User'
                });
            } else {
                setCurrentUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if(error) {
            console.error("Error logging out:", error);
        }
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
