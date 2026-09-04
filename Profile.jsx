import React, { useEffect, useState } from 'react';
import { BookOpen, Gem, LogOut, Pencil, Save, ShieldCheck, Sparkles, Trophy, UserRound } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from './AuthContext';
import { updateDisplayName } from './services/supabase/profileService.js';

export default function Profile() {
  const { isAuthenticated, isLoadingAuth, profile, user, logout, refreshProfile, navigateToLogin } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setDisplayName(profile?.display_name || ''); }, [profile?.display_name]);

  if (isLoadingAuth) return <div className="min-h-screen bg-background"><Navbar /><div className="flex min-h-[70vh] items-center justify-center text-sm text-muted-foreground">Carregando perfil…</div></div>;
  if (!isAuthenticated) return <div className="min-h-screen bg-background"><Navbar /><main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center"><UserRound className="h-10 w-10 text-muted-foreground/40" /><h1 className="mt-4 text-2xl font-black">Entre para acessar seu perfil</h1><p className="mt-2 text-sm text-muted-foreground">Seu nível, moedas, inventário e Display Name ficam vinculados ao Discord.</p><button type="button" onClick={navigateToLogin} className="mt-6 min-h-12 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground">Entrar com Discord</button></main></div>;

  const saveName = async () => {
    setBusy(true); setMessage('');
    try { await updateDisplayName(displayName); await refreshProfile(); setEditing(false); setMessage('Display Name atualizado.'); }
    catch (err) { setMessage(err?.message === 'DISPLAY_NAME_LENGTH' ? 'Use entre 2 e 32 caracteres.' : err?.message || 'Falha ao salvar.'); }
    finally { setBusy(false); }
  };

  const discordName = profile?.discord_username || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Conta Discord';
  const avatar = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-border bg-muted">{avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-8 w-8 text-muted-foreground" />}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">Discord: {discordName}</span>{profile?.role === 'admin' && <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-primary"><ShieldCheck className="h-3 w-3" /> Admin</span>}</div>
              <div className="mt-3 flex items-center gap-2">{editing ? <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-xl font-black outline-none focus:border-primary/60" /> : <h1 className="truncate text-3xl font-black tracking-[-.04em]">{profile?.display_name || discordName}</h1>}<button type="button" disabled={busy} onClick={editing ? saveName : () => setEditing(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:border-primary/45 hover:text-primary">{editing ? <Save className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}</button></div>
              <p className="mt-2 text-sm text-muted-foreground">Seu perfil registra progresso de coleção e economia; cartas não possuem poder numérico.</p>
            </div>
          </div>
          {message && <p className="mt-4 rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">{message}</p>}
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric icon={Trophy} label="Nível" value={profile?.level ?? 1} />
          <Metric icon={Sparkles} label="Fragmentos" value={profile?.astral_shards ?? 0} />
          <Metric icon={Gem} label="Núcleos" value={profile?.ether_cores ?? 0} />
          <Metric icon={BookOpen} label="Sorte Cósmica" value={`${Number(profile?.cosmic_luck ?? 1).toFixed(2)}x`} />
        </section>

        <section className="mt-5 rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-black">Progressão do acervo</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Nível, XP e pity continuam como progressão de conta e gacha. Eles não alteram atributos de personagens, formas, bosses ou itens.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><Mini label="XP" value={profile?.xp ?? 0} /><Mini label="Pity atual" value={profile?.pity_counter ?? 0} /><Mini label="Conta vinculada" value="Discord" /></div>
          <button type="button" onClick={logout} className="mt-6 flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-black text-muted-foreground hover:border-destructive/40 hover:text-destructive"><LogOut className="h-4 w-4" /> Sair da conta</button>
        </section>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) { return <div className="rounded-2xl border border-border bg-card p-4"><Icon className="h-4 w-4 text-primary" /><div className="mt-3 text-xl font-black">{value}</div><div className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-muted-foreground">{label}</div></div>; }
function Mini({ label, value }) { return <div className="rounded-xl border border-border bg-background p-3"><div className="text-sm font-black">{value}</div><div className="mt-1 text-[9px] font-black uppercase tracking-[.1em] text-muted-foreground">{label}</div></div>; }
