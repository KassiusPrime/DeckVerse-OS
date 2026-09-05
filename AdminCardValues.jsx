import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Save, Settings2 } from 'lucide-react';
import Navbar from './Navbar';
import { adminSetCardValueConfig, getCardValueConfig } from './services/supabase/metagameService.js';

const RARITIES = ['R', 'SR', 'SSR', 'UR', 'LR', 'MR'];
const ENTITY_TYPES = [
  ['character', 'Character'],
  ['boss', 'Boss'],
  ['item', 'Item'],
];

const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function AdminCardValues() {
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    getCardValueConfig().then((row) => alive && setConfig(row.value)).catch((error) => alive && setMessage(error?.message || 'Falha ao carregar configuração.'));
    return () => { alive = false; };
  }, []);

  const examples = useMemo(() => {
    if (!config) return [];
    return RARITIES.map((rarity) => ({
      rarity,
      character: Math.round(numberValue(config.base_by_rarity?.[rarity], 0) * numberValue(config.entity_multiplier?.character, 1)),
      boss: Math.round(numberValue(config.base_by_rarity?.[rarity], 0) * numberValue(config.entity_multiplier?.boss, 1)),
      item: Math.round(numberValue(config.base_by_rarity?.[rarity], 0) * numberValue(config.entity_multiplier?.item, 1)),
    }));
  }, [config]);

  const setBase = (rarity, value) => setConfig((prev) => ({ ...prev, base_by_rarity: { ...(prev?.base_by_rarity || {}), [rarity]: Math.max(1, Math.round(numberValue(value, 1))) } }));
  const setMultiplier = (type, value) => setConfig((prev) => ({ ...prev, entity_multiplier: { ...(prev?.entity_multiplier || {}), [type]: Math.max(0.01, numberValue(value, 1)) } }));

  const save = async () => {
    setBusy(true); setMessage('');
    try {
      const normalized = {
        ...config,
        fallback_base: Math.max(1, Math.round(numberValue(config?.fallback_base, 100))),
        liquidation_rate: Math.min(1, Math.max(0, numberValue(config?.liquidation_rate, 0.35))),
        base_by_rarity: Object.fromEntries(RARITIES.map((rarity) => [rarity, Math.max(1, Math.round(numberValue(config?.base_by_rarity?.[rarity], 1)))])),
        entity_multiplier: Object.fromEntries(ENTITY_TYPES.map(([type]) => [type, Math.max(0.01, numberValue(config?.entity_multiplier?.[type], 1))])),
        collection_multipliers: config?.collection_multipliers || {},
      };
      const row = await adminSetCardValueConfig(normalized);
      setConfig(row.value);
      setMessage('Valores globais atualizados. Todas as cartas passam a usar a nova fórmula imediatamente.');
    } catch (error) { setMessage(error?.message || 'Falha ao salvar.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-7 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-primary/25 bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-primary"><Settings2 className="h-4 w-4" /> Administração</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">Valor global das cartas</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">O valor não depende de ATK, DEF, HP ou qualquer estatística de combate. A fórmula usa raridade × tipo de entidade × multiplicador opcional da coleção.</p>
        </section>

        {!config ? <div className="mt-5 rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">Carregando configuração…</div> : <>
          <section className="mt-5 rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2"><Coins className="h-5 w-5 text-primary" /><h2 className="text-lg font-black">Base por raridade</h2></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{RARITIES.map((rarity) => <label key={rarity} className="rounded-2xl border border-border bg-background p-4"><div className="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">{rarity}</div><input type="number" min="1" value={config.base_by_rarity?.[rarity] ?? 0} onChange={(e) => setBase(rarity, e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-black outline-none focus:border-primary/60" /><div className="mt-1 text-[10px] text-muted-foreground">Deck Credits</div></label>)}</div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-5 sm:p-6"><h2 className="text-lg font-black">Multiplicador por tipo</h2><div className="mt-4 space-y-3">{ENTITY_TYPES.map(([type, label]) => <label key={type} className="grid grid-cols-[1fr_120px] items-center gap-3 rounded-xl border border-border bg-background p-3"><span className="text-sm font-black">{label}</span><input type="number" min="0.01" step="0.05" value={config.entity_multiplier?.[type] ?? 1} onChange={(e) => setMultiplier(type, e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-sm font-black" /></label>)}</div></div>
            <div className="rounded-3xl border border-border bg-card p-5 sm:p-6"><h2 className="text-lg font-black">Liquidação</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Percentual do valor nominal recebido ao liquidar uma carta.</p><label className="mt-4 block rounded-xl border border-border bg-background p-4"><span className="text-[10px] font-black uppercase tracking-[.12em] text-muted-foreground">Taxa</span><div className="mt-2 flex items-center gap-2"><input type="number" min="0" max="1" step="0.01" value={config.liquidation_rate ?? 0.35} onChange={(e) => setConfig((prev) => ({ ...prev, liquidation_rate: numberValue(e.target.value, 0.35) }))} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm font-black" /><span className="text-sm font-black">{Math.round(numberValue(config.liquidation_rate, 0.35) * 100)}%</span></div></label></div>
          </section>

          <section className="mt-5 rounded-3xl border border-border bg-card p-5 sm:p-6"><h2 className="text-lg font-black">Prévia da fórmula</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="text-[10px] font-black uppercase tracking-[.12em] text-muted-foreground"><tr><th className="px-3 py-2">Raridade</th><th className="px-3 py-2">Character</th><th className="px-3 py-2">Boss</th><th className="px-3 py-2">Item</th></tr></thead><tbody>{examples.map((row) => <tr key={row.rarity} className="border-t border-border"><td className="px-3 py-3 font-black text-primary">{row.rarity}</td><td className="px-3 py-3">{row.character.toLocaleString('pt-BR')} DC</td><td className="px-3 py-3">{row.boss.toLocaleString('pt-BR')} DC</td><td className="px-3 py-3">{row.item.toLocaleString('pt-BR')} DC</td></tr>)}</tbody></table></div></section>

          <button type="button" disabled={busy} onClick={save} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-50"><Save className="h-4 w-4" />{busy ? 'Salvando…' : 'Salvar valores globais'}</button>
        </>}
        {message && <div className="mt-4 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">{message}</div>}
      </main>
    </div>
  );
}
