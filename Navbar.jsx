import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, CircleHelp, Coins, Gamepad2, Gem, Layers, LogIn, Menu, Package, Search, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react';
import DeckVerseLogo from './DeckVerseLogo';
import { useAuth } from './AuthContext';

const NAV_LINKS = [
  { to: '/collections', label: 'Coleções', icon: Layers },
  { to: '/characters', label: 'Personagens', icon: UserRound },
  { to: '/forms', label: 'Formas', icon: Sparkles },
  { to: '/items', label: 'Itens', icon: Package },
  { to: '/game', label: 'Jogo', icon: Gamepad2 },
  { to: '/gacha', label: 'Gacha', icon: Gem },
  { to: '/support', label: 'Suporte', icon: CircleHelp },
];

const linkClass = ({ isActive }) => `flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-extrabold transition ${isActive ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`;

export default function Navbar({ onSearch }) {
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, profile } = useAuth();

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onPointerDown = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setMobileOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [mobileOpen]);

  const submitSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (onSearch) onSearch(value);
    if (value) navigate(`/characters?search=${encodeURIComponent(value)}`);
    else window.dispatchEvent(new CustomEvent('open-global-search', { detail: { query: value } }));
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <nav className="mx-auto flex min-h-16 w-full max-w-[1480px] items-center gap-3 px-4 sm:px-6 lg:px-8" aria-label="Navegação principal">
        <Link to="/" className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"><DeckVerseLogo size="sm" showTagline={false} /></Link>
        <form onSubmit={submitSearch} className="ml-1 hidden min-w-0 flex-1 md:block xl:max-w-sm"><label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Buscar personagem, forma ou item" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar personagem, forma ou item" className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15" /></label></form>

        <div className="ml-auto hidden items-center gap-1 xl:flex">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={linkClass}><Icon className="h-4 w-4" />{label}</NavLink>)}
          {isAdmin && <NavLink to="/admin/card-values" className={linkClass}><Coins className="h-4 w-4" />Valores</NavLink>}
          {isAdmin && <NavLink to="/admin/synopses" className={linkClass}><BookOpen className="h-4 w-4" />Sinopses</NavLink>}
          {isAdmin && <NavLink to="/admin" className={linkClass}><ShieldCheck className="h-4 w-4" />Admin</NavLink>}
        </div>

        <div className="ml-auto flex items-center gap-2 xl:ml-0">
          {isAuthenticated ? <Link to="/profile" className="hidden min-h-10 max-w-[170px] items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-extrabold text-foreground hover:border-primary/40 sm:flex"><UserRound className="h-4 w-4 text-primary" /><span className="truncate">{profile?.display_name || profile?.discord_username || 'Perfil'}</span></Link> : <Link to="/login" className="hidden min-h-10 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground sm:flex"><LogIn className="h-4 w-4" />Entrar</Link>}
          <button type="button" onClick={() => setMobileOpen((value) => !value)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:border-primary/40 hover:bg-muted xl:hidden" aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobileOpen}>{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </nav>

      {mobileOpen && <div ref={menuRef} className="border-t border-border bg-background px-4 py-4 shadow-2xl xl:hidden"><form onSubmit={submitSearch} className="mb-3 md:hidden"><label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Buscar personagem, forma ou item" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar personagem, forma ou item" className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary/60" /></label></form><div className="grid gap-1 sm:grid-cols-2">{NAV_LINKS.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={linkClass}><Icon className="h-4 w-4" />{label}</NavLink>)}<NavLink to={isAuthenticated ? '/profile' : '/login'} onClick={() => setMobileOpen(false)} className={linkClass}>{isAuthenticated ? <UserRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}{isAuthenticated ? 'Perfil' : 'Entrar com Discord'}</NavLink>{isAdmin && <NavLink to="/admin/card-values" onClick={() => setMobileOpen(false)} className={linkClass}><Coins className="h-4 w-4" />Valores das cartas</NavLink>}{isAdmin && <NavLink to="/admin/synopses" onClick={() => setMobileOpen(false)} className={linkClass}><BookOpen className="h-4 w-4" />Sinopses</NavLink>}{isAdmin && <NavLink to="/admin" onClick={() => setMobileOpen(false)} className={linkClass}><ShieldCheck className="h-4 w-4" />Admin</NavLink>}</div></div>}
    </header>
  );
}
