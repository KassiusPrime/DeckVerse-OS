import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, CircleHelp, Command, Search, Sparkles } from 'lucide-react';
import Navbar from './Navbar';

const ENTRIES = [
  { group: 'Começando', title: 'Como entro no DeckVerse?', body: 'Use Entrar com Discord. O Discord identifica sua conta; depois você pode definir um Display Name próprio no perfil.' },
  { group: 'Conta', title: 'Posso trocar meu apelido?', body: 'Sim. O Display Name do DeckVerse é independente do username/tag do Discord e pode ser alterado pelo perfil.' },
  { group: 'Gacha', title: 'O que é Sorte Cósmica?', body: 'É o pity adaptativo. A cada giro sem um drop de tier alto, seu contador aumenta e melhora progressivamente a chance de raridades superiores dentro dos limites definidos pela configuração do jogo.' },
  { group: 'Gacha', title: 'Como funcionam rolls em lote?', body: 'Você pode usar o botão de múltiplos giros ou o comando $rolls. O limite do lote cresce com o Nível da Conta e é validado no servidor.' },
  { group: 'Economia', title: 'Fragmentos Astrais', body: 'Moeda comum obtida em atividade, reciclagem e recompensas de jogo. É a moeda padrão de giros comuns.' },
  { group: 'Economia', title: 'Núcleos de Éter', body: 'Moeda premium obtida em eventos, vitórias e marcos. O uso e os custos são configurados pelo sistema de jogo.' },
  { group: 'Progressão', title: 'Como o PWR é calculado?', body: 'O Poder Total considera atributos das cartas equipadas e bônus de coleção. O cálculo oficial é feito no backend para evitar manipulação no navegador.' },
  { group: 'Coleções', title: 'Por que não vejo códigos como COL-01-JJK?', body: 'Códigos internos e UUIDs são detalhes técnicos. A interface pública mostra apenas nomes, arte, raridade e atributos relevantes.' },
  { group: 'Comandos', title: '$roll', body: 'Executa um giro individual usando a moeda padrão configurada.' },
  { group: 'Comandos', title: '$rolls 10', body: 'Executa até 10 giros de uma vez, respeitando o limite do seu nível e o saldo disponível.' },
  { group: 'Comandos', title: '$inventory', body: 'Mostra seu inventário no Discord com paginação por botões.' },
  { group: 'Comandos', title: '$profile', body: 'Mostra nível, PWR, moedas e Sorte Cósmica.' },
  { group: 'Segurança', title: 'Administradores conseguem alterar economia?', body: 'Sim, mas ajustes passam por funções protegidas, RLS e ledger de auditoria. O navegador não recebe a chave service_role.' },
];

export default function Support() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const needle = query.trim().toLowerCase();
  const filtered = useMemo(() => ENTRIES.filter((entry) => !needle || `${entry.group} ${entry.title} ${entry.body}`.toLowerCase().includes(needle)), [needle]);
  const groups = useMemo(() => [...new Set(filtered.map((entry) => entry.group))], [filtered]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-9">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.16em] text-primary"><CircleHelp className="h-4 w-4" /> Central de suporte</div>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-[-.04em] sm:text-5xl">Regras, comandos e mecânicas sem ruído técnico.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">Pesquise por gacha, pity, inventário, moedas, comandos ou progressão.</p>
          <label className="relative mt-7 block max-w-3xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: $rolls, Sorte Cósmica, Fragmentos Astrais…" className="h-14 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
          </label>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Feature icon={Command} title="Comandos" text="Referência rápida para Discord e ações equivalentes no site." />
          <Feature icon={Sparkles} title="Probabilidades" text="Entenda tiers, pity adaptativo e limites de rolls em lote." />
          <Feature icon={BookOpen} title="Regras" text="Economia, progressão, inventário e funcionamento do acervo." />
        </section>

        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group}>
              <h2 className="mb-3 text-xs font-black uppercase tracking-[.16em] text-muted-foreground">{group}</h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {filtered.filter((entry) => entry.group === group).map((entry) => {
                  const key = `${entry.group}:${entry.title}`;
                  const expanded = open === key;
                  return (
                    <button key={key} type="button" onClick={() => setOpen(expanded ? null : key)} className="block w-full border-b border-border/70 p-5 text-left last:border-b-0 hover:bg-muted/30">
                      <div className="flex items-center justify-between gap-4"><span className="text-sm font-extrabold">{entry.title}</span><ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${expanded ? 'rotate-180' : ''}`} /></div>
                      {expanded && <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">{entry.body}</p>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {!filtered.length && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Nenhum tópico encontrado.</div>}
        </div>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, title, text }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><Icon className="h-5 w-5 text-primary" /><h3 className="mt-3 text-sm font-black">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>;
}
