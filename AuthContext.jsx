import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getPublicSiteUrl, getSupabaseBrowserClient, isSupabaseConfigured } from './services/supabase/client.js';
import { getMyProfile } from './services/supabase/profileService.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const hydrate = useCallback(async (nextSession = null) => {
    if (!isSupabaseConfigured()) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsLoadingAuth(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const resolvedSession = nextSession ?? (await supabase.auth.getSession()).data.session;
    setSession(resolvedSession || null);
    setUser(resolvedSession?.user || null);
    if (resolvedSession?.user) {
      try {
        setProfile(await getMyProfile());
      } catch (error) {
        console.warn('[DeckVerse Auth] profile hydration failed', error);
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
    setIsLoadingAuth(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured()) {
      setIsLoadingAuth(false);
      return undefined;
    }

    const supabase = getSupabaseBrowserClient();
    hydrate().catch((error) => {
      if (!mounted) return;
      setAuthError({ type: 'auth_boot_failed', message: error?.message || 'Falha ao carregar a sessão.' });
      setIsLoadingAuth(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      window.setTimeout(() => hydrate(nextSession), 0);
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe?.();
    };
  }, [hydrate]);

  const signInWithDiscord = useCallback(async () => {
    if (!isSupabaseConfigured()) throw new Error('SUPABASE_NOT_CONFIGURED');
    const supabase = getSupabaseBrowserClient();
    const redirectTo = `${getPublicSiteUrl()}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo, scopes: 'identify email' },
    });
    if (error) throw error;
    return data;
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const { error } = await getSupabaseBrowserClient().auth.signOut();
      if (error) throw error;
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return null;
    const next = await getMyProfile();
    setProfile(next);
    return next;
  }, [user]);

  const isAuthenticated = Boolean(session?.user);
  const isAdmin = isAuthenticated && profile?.role === 'admin';

  const value = useMemo(() => ({
    session,
    user,
    profile,
    isAuthenticated,
    isAdmin,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError,
    supabaseConfigured: isSupabaseConfigured(),
    signInWithDiscord,
    logout,
    refreshProfile,
    navigateToLogin: () => { window.location.assign('/login'); },
    checkAppState: hydrate,
  }), [session, user, profile, isAuthenticated, isAdmin, isLoadingAuth, authError, signInWithDiscord, logout, refreshProfile, hydrate]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context) return context;
  return {
    session: null,
    user: null,
    profile: null,
    isAuthenticated: false,
    isAdmin: false,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    supabaseConfigured: false,
    signInWithDiscord: async () => {},
    logout: async () => {},
    refreshProfile: async () => null,
    navigateToLogin: () => {},
    checkAppState: async () => {},
  };
};

export default AuthContext;
