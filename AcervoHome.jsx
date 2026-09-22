import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import getAcervoCollections from './services/acervo/useCases/getAcervoCollections.js';

export default function AcervoHome() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getAcervoCollections().then((data) => {
      if (alive) setCollections(data || []);
    }).catch((err) => {
      if (alive) setError(err?.message || 'Falha ao carregar as coleções.');
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  return <><Navbar/><main className="min-h-screen bg-background px-4 pb-24 pt-6 text-foreground sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-7">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-primary"><BookOpen className="h-4 w-4"/>DeckVerse · Acervo</div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Acervo</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Selecione uma coleção para abrir o espaço de gerenciamento de cartas, formas e itens.</p>
      </header>
      {loading && <div className="flex min-h-48 items-center justify-center rounded-3xl border border-border bg-card"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
      {!loading && error && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>}
      {!loading && !error && !collections.length && <div className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Nenhuma coleção encontrada.</div>}
      {!loading && !error && collections.length > 0 && <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {collections.map((collection) => <Link key={collection.id} to={`/acervo/${encodeURIComponent(collection.id)}`} className="group overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl">
          <div className="aspect-[16/9] overflow-hidden bg-muted">{collection.cover_url ? <img src={collection.cover_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"/> : <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-[.15em] text-muted-foreground">Sem capa</div>}</div>
          <div className="flex items-center justify-between gap-3 p-5"><div className="min-w-0"><h2 className="truncate text-lg font-black">{collection.name}</h2><p className="mt-1 truncate text-[10px] text-muted-foreground">{collection.id}</p></div><ArrowRight className="h-5 w-5 shrink-0 text-primary transition group-hover:translate-x-1"/></div>
        </Link>)}
      </section>}
    </div>
  </main></>;
}
