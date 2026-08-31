import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Gamepad2, LogIn, ShieldCheck, Sparkles } from 'lucide-react';
import DeckVerseLogo from './DeckVerseLogo';
import { useAuth } from './AuthContext';

export default function Login() {
  const { isAuthenticated, isLoadingAuth, signInWithDiscord, supabaseConfigured } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/profile" replace />;

  const handleDiscord = async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithDiscord();
    } catch (err) {
      setError(err?.message === 'SUPABASE_NOT_CONFIGURED'
        ? 'O Supabase ainda não foi conectado a este ambiente.'
        : err?.message || 'Não foi possível iniciar o login com Discord.');
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[78vh] w-full max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative hidden min-h-[560px] overflow-hidden border-r border-border bg-muted/20 p-10 lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/.16),transparent_36%),radial-gradient(circle_at_80%_70%,hsl(var(--secondary)/.12),transparent_34%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <DeckVerseLogo size="lg" showTagline />
              <div>
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary"><Sparkles className="h-7 w-7" /></div>
                <h1 className="max-w-lg text-4xl font-black tracking-[-.045em]">Sua conta, seu acervo, seu progresso.</h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">O Discord identifica sua conta. Seu nome de exibição no DeckVerse continua editável e separado da sua tag do Discord.</p>
              </div>
            </div>
          </div>

          <div className="flex min-h-[520px] flex-col justify-center p-6 sm:p-10 lg:p-12">
            <div className="lg:hidden"><DeckVerseLogo size="md" showTagline={false} /></div>
            <div className="mt-8 lg:mt-0">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.16em] text-primary"><ShieldCheck className="h-4 w-4" /> Conta DeckVerse</div>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Entrar com Discord</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Usamos o OAuth nativo do Supabase. Sua senha do Discord nunca passa pelo DeckVerse.</p>
            </div>

            <button
              type="button"
              onClick={handleDiscord}
              disabled={busy || isLoadingAuth || !supabaseConfigured}
              className="mt-8 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#5865F2] px-5 text-sm font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Gamepad2 className="h-5 w-5" />
              {busy ? 'Redirecionando…' : 'Continuar com Discord'}
              <LogIn className="h-4 w-4" />
            </button>

            {!supabaseConfigured && <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-200">Ambiente ainda sem as variáveis públicas do projeto Supabase DeckVerse.</div>}
            {error && <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}

            <div className="mt-8 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-background/70 p-3"><strong className="block text-foreground">Discord</strong>ID, avatar e identidade da conta.</div>
              <div className="rounded-xl border border-border bg-background/70 p-3"><strong className="block text-foreground">DeckVerse</strong>Apelido, moedas, nível e inventário.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
