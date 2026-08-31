import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { queryClientInstance } from "./query-client";
import PageNotFound from "./PageNotFound";
import { AuthProvider, useAuth } from "./AuthContext";
import { TacticalToastContainer } from "./TacticalToast";
import BottomNav from "./BottomNav";
import CommandPalette from "./CommandPalette";
import Home from "./Home";
import Catalog from "./Catalog";
import CollectionsHub from "./CollectionsHub";
import FormsCatalog from "./FormsCatalog";
import CardDetail from "./CardDetail";
import MyCollection from "./MyCollection";
import Admin from "./Admin";
import OwnerConsole from "./OwnerConsole";
import Login from "./Login";
import Settings from "./Settings";
import Profile from "./Profile";
import LoreArchive from "./pages/LoreArchive";
import FandomImporter from "./pages/FandomImporter";
import Roster from "./Roster";
import Store from "./Store";
import Leaderboard from "./Leaderboard";
import BattleHistory from "./BattleHistory";
import SynergyBuilder from "./SynergyBuilder";
import GachaDrop from "./GachaDrop";
import CardUpgrade from "./CardUpgrade";
import Market from "./Market";
import Arena from "./Arena";
import Quests from "./Quests";
import Guilds from "./Guilds";
import Trade from "./Trade";
import GlobalRanking from "./GlobalRanking";
import GemShop from "./GemShop";
import Dashboard from "./Dashboard";
import Inventory from "./Inventory";

const OwnerRouteGuard = ({ children, returnTo = "/owner" }) => {
  const { isAuthenticated, isLoadingAuth, isOwner } = useAuth();
  if (isLoadingAuth) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted-foreground">Verificando sua sessão...</p>
      </main>
    );
  }
  if (!isAuthenticated) return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  if (!isOwner) return <PageNotFound />;
  return children;
};

function AnimatedRoutes() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const motionProps = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 }, transition: { duration: 0.16, ease: "easeOut" } };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname} className="min-h-screen pb-24 md:pb-0" {...motionProps}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/collections" element={<CollectionsHub />} />
          <Route path="/collections/:collectionCode" element={<CollectionsHub />} />
          <Route path="/characters" element={<Catalog initialType="characters" />} />
          <Route path="/forms" element={<FormsCatalog />} />
          <Route path="/items" element={<Catalog initialType="items" />} />
          <Route path="/bosses" element={<Navigate to="/forms" replace />} />
          <Route path="/my-collection" element={<MyCollection />} />
          <Route path="/card/:id" element={<CardDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/lore" element={<LoreArchive />} />

          <Route path="/owner" element={<OwnerRouteGuard><OwnerConsole /></OwnerRouteGuard>} />
          <Route path="/owner/advanced" element={<OwnerRouteGuard returnTo="/owner/advanced"><Admin /></OwnerRouteGuard>} />
          <Route path="/owner/fandom" element={<OwnerRouteGuard returnTo="/owner/fandom"><FandomImporter /></OwnerRouteGuard>} />
          <Route path="/admin" element={<Navigate to="/owner" replace />} />
          <Route path="/adm" element={<Navigate to="/owner" replace />} />
          <Route path="/fandom" element={<Navigate to="/owner/fandom" replace />} />

          <Route path="/roster" element={<Roster />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/gacha" element={<GachaDrop />} />
          <Route path="/store" element={<Store />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/battles" element={<BattleHistory />} />
          <Route path="/synergy" element={<SynergyBuilder />} />
          <Route path="/upgrade" element={<CardUpgrade />} />
          <Route path="/market" element={<Market />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/guilds" element={<Guilds />} />
          <Route path="/trade" element={<Trade />} />
          <Route path="/ranking" element={<GlobalRanking />} />
          <Route path="/gemshop" element={<GemShop />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function ProductRuntime() {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
        <p className="mt-4 text-sm font-semibold text-muted-foreground">Carregando DeckVerse...</p>
      </div>
    );
  }

  return (
    <>
      <AnimatedRoutes />
      <BottomNav />
      <CommandPalette />
    </>
  );
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
