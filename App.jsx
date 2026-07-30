import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { TacticalToastContainer } from '@/components/ui/TacticalToast';
import BottomNav from '@/components/nav/BottomNav';
import CommandPalette from '@/components/nav/CommandPalette';
import Home from './pages/Home';
import Collections from './pages/Collections';
import CardDetail from './pages/CardDetail';
import Roster from './pages/Roster';
import Store from './pages/Store';
import Leaderboard from './pages/Leaderboard';
import BattleHistory from './pages/BattleHistory';
import Admin from './pages/Admin';
import SynergyBuilder from './pages/SynergyBuilder';
import GachaDrop from './pages/GachaDrop';
import CardUpgrade from './pages/CardUpgrade';
import Market from './pages/Market';
import Arena from './pages/Arena';
import Quests from './pages/Quests';
import Guilds from './pages/Guilds';
import Settings from './pages/Settings';
import Trade from './pages/Trade';
import GlobalRanking from './pages/GlobalRanking';
import Profile from './pages/Profile';
import GemShop from './pages/GemShop';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
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
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
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

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
          <BottomNav />
          <CommandPalette />
        </Router>
        <TacticalToastContainer />
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App