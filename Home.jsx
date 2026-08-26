import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Layers,
  Package,
  Search,
  ShieldCheck,
  Skull,
  Sparkles,
  UserRound,
} from "lucide-react";
import { db } from "@/deckverseClient";
import Navbar from "@/Navbar";
import DeckVerseLogo from "./DeckVerseLogo";

const getImage = (entity) => entity?.image_url || entity?.imageUrl || entity?.img || entity?.media_url || entity?.mediaUrl || "";
const getName = (entity) => entity?.name || entity?.canonicalName || entity?.title || "Sem nome";

function StatCard({ icon: Icon, label, value, href }) {
  return (
    <Link to={href} className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_16px_40px_rgba(0,0,0,.22)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="mt-4 text-2xl font-black tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-xs font-semibold text-muted-foreground">{label}</div>
    </Link>
  );
}

function CollectionTile({ collection }) {
  const image = getImage(collection);
  const name = getName(collection);
  return (
    <Link to="/collections" className="group relative min-h-[190px] overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/45">
      {image ? <img src={image} alt={name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.18),transparent_62%)]" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
      <div className="absolute inset-x-4 bottom-4">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/55">{collection?.code || "Coleção"}</div>
        <h3 className="mt-1 text-lg font-black text-white">{name}</h3>
      </div>
    </Link>
  );
}

function CharacterTile({ entity }) {
  const image = getImage(entity);
  const name = getName(entity);
  return (
    <Link to={entity?.id ? `/card/${entity.id}` : "/characters"} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/45">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {image ? <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" /> : <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.14),transparent_62%)]"><UserRound className="h-8 w-8 text-muted-foreground/30" /></div>}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 to-transparent" />
        <div className="absolute inset-x-3 bottom-3">
          <h3 className="line-clamp-2 text-sm font-extrabold leading-tight text-white">{name}</h3>
          <p className="mt-1 truncate text-[10px] text-white/60">{entity?.series || entity?.collection || entity?.collectionCode || "DeckVerse"}</p>
        </div>
      </div>
    </Link>
  );
}

function EmptyMessage({ text }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">{text}</div>;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const collectionsQuery = useQuery({ queryKey: ["home-collections"], queryFn: () => db.entities.Collection.list() });
  const charactersQuery = useQuery({ queryKey: ["home-characters"], queryFn: () => db.entities.Card.list("-created_date", 1000) });
  const itemsQuery = useQuery({ queryKey: ["home-items"], queryFn: () => db.entities.Item.list() });
  const bossesQuery = useQuery({ queryKey: ["home-bosses"], queryFn: () => db.entities.Boss.list() });

  const collections = collectionsQuery.data || [];
  const characters = charactersQuery.data || [];
  const items = itemsQuery.data || [];
  const bosses = bossesQuery.data || [];
  const isLoading = collectionsQuery.isLoading || charactersQuery.isLoading || itemsQuery.isLoading || bossesQuery.isLoading;

  const featuredCollections = useMemo(() => collections.filter((entry) => getName(entry)).slice(0, 6), [collections]);
  const recentCharacters = useMemo(() => characters.filter((entry) => getName(entry)).slice(0, 8), [characters]);

  const handleSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/characters?search=${encodeURIComponent(value)}` : "/characters");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
          <div className="pointer-events-none absolute inset-0 archive-grid opacity-45" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
          <div className="relative mx-auto max-w-5xl text-center">
            <div className="mb-6 flex justify-center"><DeckVerseLogo size="lg" showTagline /></div>
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground backdrop-blur"><Sparkles className="h-3.5 w-3.5 text-accent" /> Arquivo multiversal colecionável</div>
            <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">Explore. Colecione. <span className="text-primary">Desbloqueie.</span></h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Um catálogo único para universos, personagens, itens e bosses. Formas canônicas pertencem à mesma carta quando são etapas reais da identidade, sem duplicar o acervo.</p>

            <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-2xl gap-2 rounded-2xl border border-border bg-card/90 p-2 shadow-[0_20px_70px_rgba(0,0,0,.25)] backdrop-blur-xl">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar personagem, universo, item ou boss..." className="h-12 w-full rounded-xl bg-transparent pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60" />
              </label>
              <button type="submit" className="min-h-12 shrink-0 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground transition hover:brightness-110 sm:px-6">Buscar</button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link to="/collections" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-extrabold text-foreground transition hover:border-primary/45 hover:bg-muted/60"><BookOpen className="h-4 w-4 text-primary" /> Explorar coleções</Link>
              <Link to="/my-collection" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-extrabold text-foreground transition hover:border-primary/45 hover:bg-muted/60"><ShieldCheck className="h-4 w-4 text-secondary" /> Minha coleção</Link>
            </div>
          </div>
        </section>

        <section aria-label="Resumo do catálogo" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Layers} label="Coleções" value={isLoading ? "—" : collections.length} href="/collections" />
          <StatCard icon={UserRound} label="Personagens" value={isLoading ? "—" : characters.length} href="/characters" />
          <StatCard icon={Package} label="Itens" value={isLoading ? "—" : items.length} href="/items" />
          <StatCard icon={Skull} label="Bosses" value={isLoading ? "—" : bosses.length} href="/bosses" />
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><div className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Universos</div><h2 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">Coleções para explorar</h2></div>
            <Link to="/collections" className="hidden min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-extrabold text-muted-foreground transition hover:text-primary sm:flex">Ver todas <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="min-h-[190px] animate-pulse rounded-2xl border border-border bg-card" />)}</div> : featuredCollections.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featuredCollections.map((collection, index) => <CollectionTile key={collection.id || collection.code || `${getName(collection)}-${index}`} collection={collection} />)}</div> : <EmptyMessage text="Nenhuma coleção disponível ainda." />}
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><div className="text-xs font-extrabold uppercase tracking-[0.16em] text-secondary">Catálogo</div><h2 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">Personagens no arquivo</h2></div>
            <Link to="/characters" className="hidden min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-extrabold text-muted-foreground transition hover:text-primary sm:flex">Abrir catálogo <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {isLoading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl border border-border bg-card" />)}</div> : recentCharacters.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{recentCharacters.map((entity, index) => <CharacterTile key={entity.id || entity.entityKey || `${getName(entity)}-${index}`} entity={entity} />)}</div> : <EmptyMessage text="Nenhum personagem disponível ainda." />}
        </section>

        <section className="mt-12 overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-accent"><ShieldCheck className="h-4 w-4" /> Seu arquivo</div><h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Uma coleção para completar, não um painel para administrar.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">A experiência principal agora prioriza posse, favoritos, raridade e desbloqueio de formas. Recursos administrativos ficam separados do catálogo público.</p></div>
            <Link to="/my-collection" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-black text-secondary-foreground transition hover:brightness-110">Abrir minha coleção <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </main>
    </div>
  );
}
