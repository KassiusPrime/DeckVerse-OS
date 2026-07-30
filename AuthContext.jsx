import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from '@/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({ id: 'user_1', name: 'DeckMaster', email: 'player@deckverse.io', role: 'admin' });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({});

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setIsLoadingAuth(true);
      setAuthError(null);

      if (db && db.auth) {
        const authed = await db.auth.isAuthenticated().catch(() => false);
        if (authed) {
          const me = await db.auth.me().catch(() => null);
          if (me) {
            setUser(me);
            setIsAuthenticated(true);
          }
        }
      }
    } catch (err) {
      console.warn("Auth check warning:", err);
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
    }
  };

  const navigateToLogin = () => {
    console.log("Navigating to login...");
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        setIsAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        setAuthError,
        appPublicSettings,
        navigateToLogin,
        logout,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: { id: 'user_1', name: 'DeckMaster', email: 'player@deckverse.io', role: 'admin' },
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: {},
      navigateToLogin: () => {},
      logout: () => {},
      checkAppState: async () => {},
    };
  }
  return context;
};

export default AuthContext;