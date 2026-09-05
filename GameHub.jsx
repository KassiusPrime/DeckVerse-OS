import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck, BookOpenCheck, Boxes, CalendarCheck2, Coins, Heart, KeyRound,
  Layers3, Pin, Search, Sparkles, Swords, Ticket, Trophy,
} from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from './AuthContext';
import { loadPublicCatalog } from './services/supabase/catalogService.js';
import { getMyRoster } from './services/supabase/gameService.js';
import {
  advanceTutorial,
  buyBadgeLevel,
  buyTowerLevel,
  claimChallenge,
  claimDaily,
  claimDailyCurrency,
  getMetaGameState,
  setCardPin,
  setCardWish,
  setCollectionDisabled,
} from './services/supabase/metagameService.js';

const TABS = [
  ['disables', 'Disables', Layers3],
  ['wishes', 'Wishs', Heart],
  ['rolls', 'Rolls', Ticket],
  ['tuto', 'Tuto', BookOpenCheck],
  ['daily', 'Daily', CalendarCheck2],
  ['chall', 'Chall', Trophy],
  ['pins', 'Pins', Pin],
  ['tower', 'Tower', Swords],
  ['keys', 'Keys', KeyRound],
  ['badge', 'Badge', BadgeCheck],
  ['collection', 'Collection', Boxes],
];

const normalize = (value) => String(value || '').trim().toLowerCase();
const number = (value) => new Intl.NumberFormat('pt-BR').format(Number(value || 0));

function friendlyError(error) {
  const raw = String(error?.message || error || 'Não foi possível concluir a ação.');
  const map = [
    ['DISABLE_LIMIT_REACHED', 'Você atingiu o limite de coleções desativadas.'],
    ['MIN_ACTIVE_COLLECTIONS_REQUIRED', 'É preciso manter o número mínimo de coleções ativas.'],
    ['WISH_LIMIT_REACHED', 'Sua wishlist atingiu o limite atual.'],
    ['PIN_LIMIT_REACHED', 'Você atingiu o limite atual de pins.'],
    ['DAILY_COOLDOWN', 'O Daily ainda está em cooldown.'],
    ['DAILY_CURRENCY_COOLDOWN', 'O Daily Credits ainda está em cooldown.'],
    ['INSUFFICIENT_DECK_CREDITS', 'Deck Credits insuficientes.'],
    ['TOWER_MAX_LEVEL', 'A Tower já está no nível máximo.'],
    ['BADGE_MAX_LEVEL', 'O Badge já está no nível máximo.'],
    ['CHALLENGE_NOT_COMPLETE', 'Esse desafio ainda não foi concluído.'],
    ['CHALLENGE_ALREADY_CLAIMED', 'Essa recompensa já foi resgatada.'],
  ];
  return map.find(([code]) => raw.includes(code))?.[1] || raw;
}

export default function GameHub() {
  const { isAuthenticated, isLoadingAuth, profile, navigateToLogin, refreshProfile } = useAuth();
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get('tab') || 'disables';
  const activeTab = TABS.some(([id]) => id === requestedTab) ? requestedTab : 'disables';
  const [search, setSearch] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState('');

  const stateQuery = useQuery({ queryKey: ['metagame-state'], queryFn: getMetaGameState, enabled: isAuthenticated, staleTime: 5_000 });
  const catalogQuery = useQuery({ queryKey: ['public-catalog-supabase'], queryFn: loadPublicCatalog, staleTime: 60_000 });
  const rosterQuery = useQuery({ queryKey: ['my-roster'], queryFn: getMyRoster, enabled: isAuthenticated, staleTime: 15_000 });

  const state = stateQuery.data || {};
  const catalog = catalogQuery.data || { collections: [], cards: [] };
  const roster = rosterQuery.data || [];
  const prefs = new Map((state.card_preferences || []).map((entry) => [entry.card_id, entry]));
  const disabledIds = new Set(state.disabled_collection_ids || []);
  const cardsById = new Map((catalog.cards || []).map((card) => [card.id, card]));
  const needle = normalize(search);

  const refreshAll = async () => {
    await Promise.all([stateQuery.refetch(), rosterQuery.refetch(), refreshProfile?.()]);
  };

  const perform = async (key, action, success) => {
    setBusyKey(key);
    setMessage('');
    try {
      await action();
      await refreshAll();
      setMessage(success || 'Atualizado.');
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setBusyKey('');
    }
  };

  const chooseTab = (tab) => {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    setParams(next, { replace: true });
    setSearch('');
    setMessage('');
  };

  if (isLoadingAuth) return <Shell><Loading /></Shell>;
  if (!isAuthenticated) return <Shell><main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center"><Sparkles className="h-10 w-10 text-primary" /><h1 className="mt-4 text-3xl font-black">Command Center</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Entre com Discord para usar Disables, Wishs, Rolls, Daily, Tower, Keys e os demais sistemas.</p><button type="button" onClick={navigateToLogin} className="mt-6 min-h-12 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground">Entrar com Discord</button></main></Shell>;

  const collections = (catalog.collections || []).filter((entry) => !needle || normalize(entry.name).includes(needle));
  const cards = catalog.cards || [];
  const cardResults = cards.filter((entry) => !needle || [entry.name, entry.collectionName, entry.rarity].some((value) => normalize(value).includes(needle)));
  const wished = cards.filter((entry) => prefs.get(entry.id)?.wished);
  const pinned = cards.filter((entry) => prefs.get(entry.id)?.pinned);
  const keyed = (state.card_preferences || []).filter((entry) => Number(entry.keys || 0) > 0).sort((a, b) => Number(b.keys || 0) - Number(a.keys || 0));

  return (
    <Shell>
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-7 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-primary/25 bg-card p-6 sm:p-8">
          <div className="text-xs font-black uppercase tracking-[.17em] text-primary">DeckVerse Command Center</div>
          <div className="mt-2 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div><h1 className="text-3xl font-black tracking-[-.045em] sm:text-5xl">Controle seu próprio pool.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Atalhos inspirados na praticidade do Mudae, conectados ao Gacha, economia e acervo reais do DeckVerse.</p></div>
            <div className="grid grid-cols-3 gap-2"><Stat label="Rolls" value={state.free_rolls ?? 0} /><Stat label="Keys" value={state.total_keys ?? 0} /><Stat label="Valor" value={`${number(state.collection_value_dc)} DC`} /></div>
          </div>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{TABS.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => chooseTab(id)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-black ${activeTab === id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
        </section>

        {message && <div className="mt-4 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">{message}</div>}
        {(stateQuery.isError || catalogQuery.isError) && <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">Não foi possível carregar todos os dados do Command Center.</div>}

        <section className="mt-5">
          {activeTab === 'disables' && <Panel icon={Layers3} title="Disables" subtitle="A coleção continua no catálogo, mas deixa de participar somente do seu Gacha."><SearchBox value={search} onChange={setSearch} placeholder="Buscar coleção…" /><div className="mt-3 text-xs font-black text-muted-foreground">{state.disabled_count || 0}/{state.limits?.disabled || 0} desativadas</div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{collections.map((collection) => { const disabled = disabledIds.has(collection.id); return <button key={collection.id} type="button" disabled={busyKey === `disable:${collection.id}`} onClick={() => perform(`disable:${collection.id}`, () => setCollectionDisabled(collection.id, !disabled), disabled ? `${collection.name} voltou ao pool.` : `${collection.name} foi removida do seu pool.`)} className={`rounded-xl border p-3 text-left ${disabled ? 'border-destructive/40 bg-destructive/10' : 'border-border bg-background hover:border-primary/40'}`}><div className="text-sm font-black">{collection.name}</div><div className={`mt-1 text-[10px] font-black ${disabled ? 'text-destructive' : 'text-muted-foreground'}`}>{disabled ? 'DESATIVADA' : 'ATIVA'}</div></button>; })}</div></Panel>}

          {activeTab === 'wishes' && <CardPreferencePanel title="Wishs / Wishlist" icon={Heart} description="Marque cartas desejadas. Quando um Wish aparecer no Gacha, o drop será sinalizado." activeCards={wished} results={cardResults} search={search} setSearch={setSearch} limit={state.limits?.wishes || 0} isActive={(card) => Boolean(prefs.get(card.id)?.wished)} busyKey={busyKey} actionPrefix="wish" onToggle={(card) => perform(`wish:${card.id}`, () => setCardWish(card.id, !prefs.get(card.id)?.wished), prefs.get(card.id)?.wished ? 'Wish removido.' : 'Wish adicionado.')} />}

          {activeTab === 'pins' && <CardPreferencePanel title="Pins" icon={Pin} description="Fixe cartas favoritas para uso nas superfícies sociais e de perfil." activeCards={pinned} results={cardResults} search={search} setSearch={setSearch} limit={state.limits?.pins || 0} isActive={(card) => Boolean(prefs.get(card.id)?.pinned)} busyKey={busyKey} actionPrefix="pin" onToggle={(card) => perform(`pin:${card.id}`, () => setCardPin(card.id, !prefs.get(card.id)?.pinned), prefs.get(card.id)?.pinned ? 'Pin removido.' : 'Carta fixada.')} />}

          {activeTab === 'rolls' && <Panel icon={Ticket} title="Rolls" subtitle="Rolls gratuitos são um saldo independente; Fragmentos Astrais e Núcleos de Éter continuam funcionando normalmente."><div className="grid gap-3 sm:grid-cols-3"><Metric label="Rolls gratuitos" value={state.free_rolls || 0} /><Metric label="Cap atual" value={state.limits?.free_rolls || 0} /><Metric label="Rolls históricos" value={state.total_rolls || 0} /></div><Link to="/gacha" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">Ir para o Gacha</Link></Panel>}

          {activeTab === 'tuto' && <Tutorial step={Number(state.tutorial_step || 0)} busy={busyKey === 'tuto'} onAdvance={(step) => perform('tuto', () => advanceTutorial(step), 'Tutorial atualizado.')} />}

          {activeTab === 'daily' && <Panel icon={CalendarCheck2} title="Daily / Daily Credits" subtitle="Daily recupera Rolls. Daily Credits é o equivalente econômico ao dailykakera, usando Deck Credits."><div className="grid gap-4 md:grid-cols-2"><DailyCard icon={Ticket} title="Daily Rolls" subtitle={`Saldo atual: ${state.free_rolls || 0} rolls`} available={state.daily_available} busy={busyKey === 'daily'} button="Resgatar Daily" onClick={() => perform('daily', claimDaily, 'Rolls do Daily resgatados.')} /><DailyCard icon={Coins} title="Daily Credits" subtitle={`Saldo: ${number(profile?.deck_credits)} DC · Badge ${state.badge_level || 0}`} available={state.daily_currency_available} busy={busyKey === 'daily-credits'} button="Resgatar Deck Credits" onClick={() => perform('daily-credits', claimDailyCurrency, 'Deck Credits resgatados.')} /></div></Panel>}

          {activeTab === 'chall' && <Panel icon={Trophy} title="Chall" subtitle="Desafios de progressão e coleção."><div className="grid gap-3 md:grid-cols-2">{(state.challenges || []).map((challenge) => <ChallengeCard key={challenge.key} challenge={challenge} busy={busyKey === `challenge:${challenge.key}`} onClaim={() => perform(`challenge:${challenge.key}`, () => claimChallenge(challenge.key), `Recompensa de ${challenge.name} resgatada.`)} />)}</div></Panel>}

          {activeTab === 'tower' && <UpgradePanel icon={Swords} title="Tower" level={state.tower_level || 0} cost={state.tower_next_cost_dc || 0} balance={profile?.deck_credits || 0} description="Cada andar amplia gradualmente limites de Disables, Wishs, Pins e Rolls gratuitos." busy={busyKey === 'tower'} onBuy={() => perform('tower', buyTowerLevel, 'Tower evoluída.')} />}

          {activeTab === 'badge' && <UpgradePanel icon={BadgeCheck} title="Badge" level={state.badge_level || 0} cost={state.badge_next_cost_dc || 0} balance={profile?.deck_credits || 0} description="Badges aumentam progressivamente o ganho do Daily Credits." busy={busyKey === 'badge'} onBuy={() => perform('badge', buyBadgeLevel, 'Badge evoluído.')} />}

          {activeTab === 'keys' && <Panel icon={KeyRound} title="Keys" subtitle="Cada cópia adicional obtida no Gacha gera uma Key para aquela carta.">{keyed.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{keyed.map((entry) => <CardRow key={entry.card_id} card={cardsById.get(entry.card_id)} tail={`${entry.keys} key${Number(entry.keys) === 1 ? '' : 's'}`} />)}</div> : <Empty text="Você ainda não acumulou Keys." />}</Panel>}

          {activeTab === 'collection' && <Panel icon={Boxes} title="Collection" subtitle="Resumo do seu acervo real com valor econômico calculado pela regra global do DeckVerse."><div className="grid gap-3 sm:grid-cols-3"><Metric label="Cartas únicas" value={state.unique_cards || 0} /><Metric label="Valor do acervo" value={`${number(state.collection_value_dc)} DC`} /><Metric label="Keys" value={state.total_keys || 0} /></div><Link to="/my-collection" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">Abrir meu acervo ({roster.length})</Link></Panel>}
        </section>
      </main>
    </Shell>
  );
}

function Shell({ children }) { return <div className="min-h-screen bg-background text-foreground"><Navbar />{children}</div>; }
function Loading() { return <div className="flex min-h-[65vh] items-center justify-center text-sm text-muted-foreground">Carregando Command Center…</div>; }
function Stat({ label, value }) { return <div className="min-w-[92px] rounded-2xl border border-border bg-background px-3 py-3 text-center"><div className="text-sm font-black">{value}</div><div className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-muted-foreground">{label}</div></div>; }
function Metric({ label, value }) { return <div className="rounded-2xl border border-border bg-background p-4"><div className="text-xl font-black">{value}</div><div className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-muted-foreground">{label}</div></div>; }
function Panel({ icon: Icon, title, subtitle, children }) { return <div className="rounded-3xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><h2 className="text-xl font-black">{title}</h2></div>{subtitle && <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>}<div className="mt-5">{children}</div></div>; }
function SearchBox({ value, onChange, placeholder }) { return <label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary/60" /></label>; }
function Empty({ text }) { return <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 text-center text-sm text-muted-foreground">{text}</div>; }

function CardRow({ card, tail, action }) {
  if (!card) return null;
  return <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"><div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">{card.imageUrl ? <img src={card.imageUrl} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{card.name}</div><div className="truncate text-[10px] text-muted-foreground">{card.collectionName}{card.rarity ? ` · ${card.rarity}` : ''}</div>{tail && <div className="mt-1 text-[10px] font-black text-primary">{tail}</div>}</div>{action}</div>;
}

function CardPreferencePanel({ title, icon, description, activeCards, results, search, setSearch, limit, isActive, busyKey, actionPrefix, onToggle }) {
  const Icon = icon;
  return <Panel icon={Icon} title={title} subtitle={description}><div className="text-xs font-black text-muted-foreground">{activeCards.length}/{limit} ativos</div><div className="mt-3"><SearchBox value={search} onChange={setSearch} placeholder="Buscar carta…" /></div>{activeCards.length > 0 && <><div className="mt-5 text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">Ativos</div><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{activeCards.map((card) => <CardRow key={card.id} card={card} action={<button type="button" disabled={busyKey === `${actionPrefix}:${card.id}`} onClick={() => onToggle(card)} className="rounded-lg border border-destructive/30 px-2 py-1 text-[10px] font-black text-destructive">Remover</button>} />)}</div></>}{search.trim() && <><div className="mt-5 text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">Resultados</div><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{results.slice(0, 30).map((card) => <CardRow key={card.id} card={card} action={<button type="button" disabled={busyKey === `${actionPrefix}:${card.id}`} onClick={() => onToggle(card)} className={`rounded-lg border px-2 py-1 text-[10px] font-black ${isActive(card) ? 'border-destructive/30 text-destructive' : 'border-primary/30 text-primary'}`}>{isActive(card) ? 'Remover' : 'Adicionar'}</button>} />)}</div></>}</Panel>;
}

function Tutorial({ step, busy, onAdvance }) {
  const steps = ['Conheça o catálogo', 'Configure seus Disables', 'Adicione um Wish', 'Faça um Roll', 'Confira Keys e Collection'];
  return <Panel icon={BookOpenCheck} title="Tuto" subtitle="Tutorial persistente do Command Center."><div className="space-y-2">{steps.map((label, index) => { const n = index + 1; const done = step >= n; return <div key={label} className={`flex items-center gap-3 rounded-xl border p-3 ${done ? 'border-primary/30 bg-primary/10' : 'border-border bg-background'}`}><div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{n}</div><div className="flex-1 text-sm font-black">{label}</div>{!done && n === step + 1 && <button type="button" disabled={busy} onClick={() => onAdvance(n)} className="rounded-lg bg-primary px-3 py-2 text-[10px] font-black text-primary-foreground">Concluir</button>}</div>; })}</div></Panel>;
}

function DailyCard({ icon: Icon, title, subtitle, available, busy, button, onClick }) { return <div className="rounded-2xl border border-border bg-background p-5"><Icon className="h-5 w-5 text-primary" /><h3 className="mt-3 text-lg font-black">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p><button type="button" disabled={!available || busy} onClick={onClick} className="mt-4 min-h-11 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-40">{available ? button : 'Em cooldown'}</button></div>; }

function ChallengeCard({ challenge, busy, onClaim }) {
  const progress = Math.min(100, Number(challenge.current || 0) / Math.max(1, Number(challenge.target || 1)) * 100);
  return <div className="rounded-2xl border border-border bg-background p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black">{challenge.name}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{challenge.description}</p></div>{challenge.claimed && <BadgeCheck className="h-5 w-5 text-primary" />}</div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div><div className="mt-2 flex justify-between gap-2 text-[10px] font-black"><span>{challenge.current}/{challenge.target}</span><span>{number(challenge.reward_amount)} {challenge.reward_currency}</span></div>{challenge.complete && !challenge.claimed && <button type="button" disabled={busy} onClick={onClaim} className="mt-3 min-h-10 rounded-xl bg-primary px-3 text-[10px] font-black text-primary-foreground">Resgatar</button>}</div>;
}

function UpgradePanel({ icon, title, level, cost, balance, description, busy, onBuy }) {
  return <Panel icon={icon} title={title} subtitle={description}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Nível" value={level} /><Metric label="Próximo custo" value={`${number(cost)} DC`} /><Metric label="Seu saldo" value={`${number(balance)} DC`} /></div><button type="button" disabled={busy || Number(balance) < Number(cost)} onClick={onBuy} className="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-40">Evoluir {title}</button></Panel>;
}
