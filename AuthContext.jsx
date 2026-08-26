import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { db } from "./deckverseClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({});

  const checkAppState = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      if (!db?.auth) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const authed = await db.auth.isAuthenticated().catch(() => false);
      if (!authed) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const me = await db.auth.me().catch(() => null);
      if (!me) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      setUser(me);
      setIsAuthenticated(true);
    } catch (error) {
      console.warn("Auth check warning:", error);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: "auth_check_failed", message: error?.message || "Falha ao validar sessão." });
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const navigateToLogin = useCallback(() => {
    window.dispatchEvent(new CustomEvent("deckverse-auth-required"));
  }, []);

  const logout = useCallback(async () => {
    try {
      if (db?.auth?.logout) await db.auth.logout();
    } catch (error) {
      console.warn("Logout warning:", error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      isAuthenticated,
      setIsAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      setIsLoadingPublicSettings,
      authError,
      setAuthError,
      appPublicSettings,
      setAppPublicSettings,
      navigateToLogin,
      logout,
      checkAppState,
    }),
    [
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      navigateToLogin,
      logout,
      checkAppState,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context) return context;

  // Fail closed when a component is rendered outside the provider.
  return {
    user: null,
    setUser: () => {},
    isAuthenticated: false,
    setIsAuthenticated: () => {},
    isLoadingAuth: true,
    isLoadingPublicSettings: false,
    setIsLoadingPublicSettings: () => {},
    authError: null,
    setAuthError: () => {},
    appPublicSettings: {},
    setAppPublicSettings: () => {},
    navigateToLogin: () => {},
    logout: async () => {},
    checkAppState: async () => {},
  };
};

export default AuthContext;
