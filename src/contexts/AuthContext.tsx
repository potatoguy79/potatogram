import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  last_seen: string;
  created_at: string;
  is_verified?: boolean;
  verified_type?: string | null;
  badge_text?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  impersonatedProfile: Profile | null;
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (password: string, username: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  impersonateUser: (targetProfile: Profile) => void;
  exitImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [realProfile, setRealProfile] = useState<Profile | null>(null);
  const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      setProfile(data);
      setRealProfile(data);
    }
    return data;
  };

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          checkAdminRole(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRealProfile(null);
        setIsAdmin(false);
        setImpersonatedProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      }
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isLoading && !user && location.pathname !== '/auth') {
      navigate('/auth');
    } else if (!isLoading && user && location.pathname === '/auth') {
      navigate('/');
    }
  }, [user, isLoading, location.pathname, navigate]);

  const signUp = async (email: string, password: string, username: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          username,
          display_name: displayName,
        },
      },
    });
    return { error };
  };

  const signIn = async (password: string, username: string) => {
    const email = `${username}@chatapp.local`;
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRealProfile(null);
    setIsAdmin(false);
    setImpersonatedProfile(null);
    navigate('/auth');
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const impersonateUser = (targetProfile: Profile) => {
    if (!isAdmin) return;
    setImpersonatedProfile(targetProfile);
    setProfile(targetProfile);
  };

  const exitImpersonation = () => {
    setImpersonatedProfile(null);
    if (realProfile) {
      setProfile(realProfile);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isLoading,
      isAdmin,
      impersonatedProfile,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      impersonateUser,
      exitImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  );
};