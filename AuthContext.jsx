import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authProvider } from "./services/firebase/authProvider.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({});

  const applyUser = useCallback((nextUser) => {
    setUser(nextUser || null);
    setIsAuthenticated(Boolean(nextUser));
  }, []);

  const checkAppState = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      applyUser(await authProvider.getCurrentUser());
    } catch (error) {
      console.warn("Auth check warning:", error);
      applyUser(null);
      setAuthError({ type: "auth_check_failed", message: error?.message || "Não foi possível confirmar sua sessão." });
    } finally {
      setIsLoadingAuth(false);
    }
  }, [applyUser]);

  useEffect(() => {
    const unsubscribe = authProvider.onAuthChange((nextUser) => {
      applyUser(nextUser);
      setIsLoadingAuth(false);
    });
    checkAppState();
    return unsubscribe;
  }, [applyUser, checkAppState]);

  const signIn = useCallback(async (email, password) => {
    setAuthError(null);
    const result = await authProvider.signIn(email, password);
    applyUser(result.user);
    return result;
  }, [applyUser]);

  const signUp = useCallback(async (name, email, password) => {
    setAuthError(null);
    const result = await authProvider.signUp(name, email, password);
    applyUser(result.user);
    return result;
  }, [applyUser]);

  const signInWithGoogle = useCallback(async (options = {}) => {
    setAuthError(null);
    const result = await authProvider.signInWithGoogle(options);
    applyUser(result.user);
    return result;
  }, [applyUser]);

  const logout = useCallback(async () => {
    try {
      await authProvider.signOut();
    } finally {
      applyUser(null);
    }
  }, [applyUser]);

  const navigateToLogin = useCallback(() => {
    window.location.assign(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, []);

  const value = useMemo(() => ({
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    isOwner: Boolean(user?.isOwner && user?.status === "active"),
    isAdmin: Boolean(user?.isAdmin && user?.status === "active"),
    isLoadingAuth,
    isLoadingPublicSettings,
    setIsLoadingPublicSettings,
    authError,
    setAuthError,
    appPublicSettings,
    setAppPublicSettings,
    navigateToLogin,
    logout,
    signIn,
    signUp,
    signInWithGoogle,
    checkAppState,
  }), [
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    navigateToLogin,
    logout,
    signIn,
    signUp,
    signInWithGoogle,
    checkAppState,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context) return context;
  return {
    user: null,
    isAuthenticated: false,
    isOwner: false,
    isAdmin: false,
    isLoadingAuth: true,
    isLoadingPublicSettings: false,
    authError: null,
    navigateToLogin: () => {},
    logout: async () => {},
    signIn: async () => {},
    signUp: async () => {},
    signInWithGoogle: async () => {},
    checkAppState: async () => {},
  };
};

export default AuthContext;
