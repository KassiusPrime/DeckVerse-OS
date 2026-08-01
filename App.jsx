import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from './query-client';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import PageNotFound from './PageNotFound';
import { AuthProvider, useAuth } from './AuthContext';
import UserNotRegisteredError from './UserNotRegisteredError';
import { TacticalToastContainer } from './TacticalToast';
import BottomNav from './BottomNav';
import CommandPalette from './CommandPalette';

import Home from './Home';
import Collections from './Collections';
import CardDetail from './CardDetail';
import Roster from './Roster';
import Store from './Store';
import Leaderboard from './Leaderboard';
import BattleHistory from './BattleHistory';
import Admin from './Admin';
import SynergyBuilder from './SynergyBuilder';
import GachaDrop from './GachaDrop';
import CardUpgrade from './CardUpgrade';
import Market from './Market';
import Arena from './Arena';
import Quests from './Quests';
import Guilds from './Guilds';
import Settings from './Settings';
import Trade from './Trade';
import GlobalRanking from './GlobalRanking';
import Profile from './Profile';
import GemShop from './GemShop';
import Dashboard from './Dashboard';
import Inventory from './Inventory';
import FandomImporter from './pages/FandomImporter';
import LoreArchive from './pages/LoreArchive';
import AdminTerminal from './AdminTerminal';
import CRTTerminalOverlay, { pushCRTLog } from './CRTTerminalOverlay';
import { dataQualityEngine } from './services/ai/dataQualityEngine';
import { backgroundSyncService } from './services/sync/backgroundSyncService';
import BackgroundSyncIndicator from './components/BackgroundSyncIndicator';

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className="pb-24 sm:pb-8 min-h-screen"
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -18 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        style={{ willChange: "opacity, transform" }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/card/:id" element={<CardDetail />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/store" element={<Store />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/battles" element={<BattleHistory />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/synergy" element={<SynergyBuilder />} />
          <Route path="/gacha" element={<GachaDrop />} />
          <Route path="/upgrade" element={<CardUpgrade />} />
          <Route path="/market" element={<Market />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/guilds" element={<Guilds />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/trade" element={<Trade />} />
          <Route path="/ranking" element={<GlobalRanking />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/gemshop" element={<GemShop />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/fandom" element={<FandomImporter />} />
          <Route path="/lore" element={<LoreArchive />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  React.useEffect(() => {
    // Run background Data Quality Audit & Background Sync Engine on startup
    const runBootSync = async () => {
      try {
        pushCRTLog("🛡️ [BACKGROUND SYNC ENGINE] Inicializando sincronização autônoma...", "INFO");
        await backgroundSyncService.startBackgroundSync("BOOT");
      } catch (err) {
        console.warn("Background sync warning:", err.message);
      }
    };
    runBootSync();
  }, []);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return <AnimatedRoutes />;
};

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthenticatedApp />
          <BottomNav />
          <CommandPalette />
          <AdminTerminal />
          <CRTTerminalOverlay />
          <BackgroundSyncIndicator />
        </Router>
        <TacticalToastContainer />
      </QueryClientProvider>
    </AuthProvider>
  );
}
