import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Crown, LogIn, LogOut, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Navbar from "./Navbar";
import { useAuth } from "./AuthContext";

export default function Account() {
  const { user, isAuthenticated, isOwner, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background"><Navbar /><main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center"><UserRound className="h-10 w-10 text-muted-foreground/40" /><h1 className="mt-4 text-2xl font-black text-foreground">Sua conta DeckVerse</h1><p className="mt-2 text-sm text-muted-foreground">Entre ou crie uma conta para sincronizar seu perfil e acervo.</p><Link to="/login?returnTo=/profile" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground"><LogIn className="h-4 w-4" /> Entrar</Link></main></div>
    );
  }

  const signOut = async () => { await logout(); navigate("/", { replace: true }); };

  return (
    <div className="min-h-screen bg-background"><Navbar /><main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-border bg-background">{user?.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-8 w-8 text-primary" />}</div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-3xl font-black tracking-tight text-foreground">{user?.name || "Usuário"}</h1>{isOwner && <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-200"><Crown className="h-3 w-3" /> Owner</span>}</div><p className="mt-1 truncate text-sm text-muted-foreground">{user?.email}</p><p className="mt-2 text-xs text-muted-foreground">Conta autenticada pelo Firebase · status {user?.status || "active"}</p></div>
          <button type="button" onClick={signOut} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-extrabold text-muted-foreground transition hover:text-foreground"><LogOut className="h-4 w-4" /> Sair</button>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link to="/my-collection" className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="mt-3 text-lg font-black text-foreground">Meu acervo</h2><p className="mt-1 text-sm text-muted-foreground">Cartas, favoritos e formas vinculados à sua experiência.</p></Link>
        <Link to="/forms" className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"><Sparkles className="h-5 w-5 text-primary" /><h2 className="mt-3 text-lg font-black text-foreground">Formas</h2><p className="mt-1 text-sm text-muted-foreground">Explore as transformações disponíveis no catálogo.</p></Link>
        {isOwner && <Link to="/owner" className="rounded-2xl border border-amber-400/25 bg-card p-5 transition hover:border-amber-400/45 sm:col-span-2"><Crown className="h-5 w-5 text-amber-300" /><h2 className="mt-3 text-lg font-black text-foreground">Painel do Proprietário</h2><p className="mt-1 text-sm text-muted-foreground">Migrações, importação do Drive e administração avançada. Este card não existe para outras contas.</p></Link>}
      </section>
    </main></div>
  );
}
