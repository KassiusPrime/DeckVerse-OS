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
import AdminContentManager from './AdminContentCenter';

class AppErrorBoundary extends React.Component {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(error) { return { hasError: true, message: error?.message || 'Erro inesperado' }; }
  componentDidCatch(error) { console.error('[DeckVerse] render error', error); }
  handleReset = () => { this.setState({ hasError: false, message: '' }); window.location.assign('/'); };
  render() {
    if (!this.state.hasError) return this.props.children;
    return <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground"><section className="w-full max-w-lg rounded-3xl border border-border bg-card p-7 text-center shadow-2xl sm:p-9"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-xl font-black text-destructive">!</div><p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-primary">DeckVerse · recuperação</p><h1 className="mt-2 text-2xl font-black">A interface encontrou um erro</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">A página foi protegida para evitar uma tela branca. Você pode voltar ao códice e continuar usando o aplicativo.</p>{this.state.message && <details className="mt-4 text-left"><summary className="cursor-pointer text-[10px] font-bold text-muted-foreground">Detalhes técnicos</summary><pre className="mt-2 max-h-28 overflow-auto rounded-xl bg-background p-3 text-[10px] text-muted-foreground">{this.state.message}</pre></details>}<button type="button" onClick={this.handleReset} className="mt-6 min-h-11 rounded-xl bg-primary px-5 text-xs font-black text-primary-foreground">VOLTAR AO INÍCIO</button></section></main>;
  }
}

function AdminRouteGuard({ children }) {
  const { isAuthenticated, isAdmin, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <RouteLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <PageNotFound />;
  return children;
}

function RouteLoading() { return <main className="flex min-h-[70vh] items-center justify-center bg-background" aria-live="polite"><div className="flex flex-col items-center gap-3"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" aria-label="Carregando" /><span className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Carregando códice</span></div></main>; }

function AccountBlocked() {
  const { accountStatus, logout } = useAuth();
  const banned = accountStatus === 'banned';
  return <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground"><section className="w-full max-w-lg rounded-3xl border border-destructive/30 bg-card p-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-2xl">!</div><h1 className="mt-5 text-2xl font-black">Conta {banned ? 'banida' : 'suspensa'}</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">O acesso ao DeckVerse está temporariamente bloqueado para esta conta. Se você acredita que isso é um erro, entre em contato com o suporte.</p><button type="button" onClick={() => logout()} className="mt-6 min-h-11 rounded-xl bg-primary px-5 text-xs font-black text-primary-foreground">SAIR DA CONTA</button></section></main>;
}

function AnimatedRoutes() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const motionProps = reduceMotion ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } } : { initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -3 }, transition: { duration: 0.14, ease: 'easeOut' } };
  return <AnimatePresence mode="wait" initial={false}><motion.div key={location.pathname} className="min-h-screen pb-24 md:pb-0" {...motionProps}><Routes location={location}>
    <Route path="/" element={<Home />} /><Route path="/login" element={<Login />} /><Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/collections" element={<CollectionsHub />} /><Route path="/collections/:collectionCode" element={<CollectionsHub />} /><Route path="/characters" element={<Catalog initialType="characters" />} /><Route path="/forms" element={<FormsCatalog />} /><Route path="/items" element={<Catalog initialType="items" />} /><Route path="/bosses" element={<Catalog initialType="bosses" />} /><Route path="/gacha" element={<Gacha />} /><Route path="/gacha/preferences" element={<Navigate to="/game?tab=disables" replace />} /><Route path="/game" element={<GameHub />} /><Route path="/my-collection" element={<MyCollection />} /><Route path="/card/:id" element={<CardDetail />} /><Route path="/profile" element={<Profile />} /><Route path="/support" element={<Support />} />
    <Route path="/admin" element={<AdminRouteGuard><AdminSupabase /></AdminRouteGuard>} /><Route path="/admin/content" element={<AdminRouteGuard><AdminContentManager /></AdminRouteGuard>} /><Route path="/admin/synopses" element={<AdminRouteGuard><AdminSynopsis /></AdminRouteGuard>} /><Route path="/admin/card-values" element={<AdminRouteGuard><AdminCardValues /></AdminRouteGuard>} /><Route path="/adm" element={<Navigate to="/admin" replace />} /><Route path="*" element={<PageNotFound />} />
  </Routes></motion.div></AnimatePresence>;
}

function ProductRuntime() { const location = useLocation(); const { isLoadingAuth, isAccountBlocked } = useAuth(); const isAuthCallback = location.pathname === '/auth/callback'; if (isLoadingAuth && !isAuthCallback) return <RouteLoading />; if (isAccountBlocked && !isAuthCallback) return <AccountBlocked />; return <><AnimatedRoutes /><BottomNav /><CommandPalette /></>; }
export default function App() { return <AppErrorBoundary><AuthProvider><QueryClientProvider client={queryClientInstance}><Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ProductRuntime /></Router><TacticalToastContainer /></QueryClientProvider></AuthProvider></AppErrorBoundary>; }
