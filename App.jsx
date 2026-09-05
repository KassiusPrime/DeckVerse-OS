import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { queryClientInstance } from './query-client';
import { AuthProvider, useAuth } from './AuthContext';
import { TacticalToastContainer } from './TacticalToast';
import BottomNav from './BottomNav';
import CommandPalette from './CommandPalette';
import PageNotFound from './PageNotFound';
import Home from './Home';
import Catalog from './Catalog';
import CollectionsHub from './CollectionsHub';
import FormsCatalog from './FormsCatalog';
import CardDetail from './CardDetail';
import MyCollection from './MyCollection';
import Profile from './Profile';
import Login from './Login';
import AuthCallback from './AuthCallback';
import Support from './Support';
import Gacha from './Gacha';
import GameHub from './GameHub';
import AdminSupabase from './AdminSupabase';
import AdminSynopsis from './AdminSynopsis';
import AdminCardValues from './AdminCardValues';

function AdminRouteGuard({ children }) {
  const { isAuthenticated, isAdmin, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <RouteLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <PageNotFound />;
  return children;
}

function RouteLoading() {
  return <main className="flex min-h-[70vh] items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" aria-label="Carregando" /></main>;
}

function AnimatedRoutes() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const motionProps = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -3 }, transition: { duration: 0.14, ease: 'easeOut' } };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname} className="min-h-screen pb-24 md:pb-0" {...motionProps}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/collections" element={<CollectionsHub />} />
          <Route path="/collections/:collectionCode" element={<CollectionsHub />} />
          <Route path="/characters" element={<Catalog initialType="characters" />} />
          <Route path="/forms" element={<FormsCatalog />} />
          <Route path="/items" element={<Catalog initialType="items" />} />
          <Route path="/bosses" element={<Catalog initialType="bosses" />} />
          <Route path="/gacha" element={<Gacha />} />
          <Route path="/gacha/preferences" element={<Navigate to="/game?tab=disables" replace />} />
          <Route path="/game" element={<GameHub />} />
          <Route path="/my-collection" element={<MyCollection />} />
          <Route path="/card/:id" element={<CardDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/support" element={<Support />} />
          <Route path="/admin" element={<AdminRouteGuard><AdminSupabase /></AdminRouteGuard>} />
          <Route path="/admin/synopses" element={<AdminRouteGuard><AdminSynopsis /></AdminRouteGuard>} />
          <Route path="/admin/card-values" element={<AdminRouteGuard><AdminCardValues /></AdminRouteGuard>} />
          <Route path="/adm" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function ProductRuntime() {
  const location = useLocation();
  const { isLoadingAuth } = useAuth();
  const isAuthCallback = location.pathname === '/auth/callback';
  if (isLoadingAuth && !isAuthCallback) return <RouteLoading />;
  return <><AnimatedRoutes /><BottomNav /><CommandPalette /></>;
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ProductRuntime />
        </Router>
        <TacticalToastContainer />
      </QueryClientProvider>
    </AuthProvider>
  );
}
