import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, Heart, ImageOff, Search, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { db } from "@/deckverseClient";
import { useAuth } from "@/AuthContext";
import Navbar from "@/Navbar";

const RARITIES = ["R", "SR", "SSR", "UR", "LR", "MR"];
const normalize = (value) => String(value ?? "").trim().toLowerCase();
const getImage = (entity) => entity?.image_url || entity?.imageUrl || entity?.img || "";
const getName = (entity) => entity?.name || entity?.canonicalName || entity?.title || "Sem nome";
const getRarity = (entity) => String(entity?.rarity || "").toUpperCase();

export default function MyCollection() {
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const cardsQuery = useQuery({ queryKey: ["my-collection-cards"], queryFn: () => db.entities.Card.list("-created_date", 1000) });
  const rosterQuery = useQuery({ queryKey: ["my-collection-roster"], queryFn: () => db.entities.Roster.list(), enabled: isAuthenticated });

  const cards = cardsQuery.data || [];
  const roster = rosterQuery.data || [];
  const favoriteKeys = useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("deckverse_favorite_cards") || "[]");
      return new Set(Array.isArray(raw) ? raw.map(String) : []);
    } catch {
      return new Set();
    }
  }, []);

  const ownedKeys = useMemo(() => {
    const set = new Set();
    roster.forEach((entry) => {
      [entry.card_id, entry.cardId, entry.card_name, entry.cardName].filter(Boolean).forEach((value) => set.add(normalize(value)));
    });
    return set;
  }, [roster]);

  const ownedCards = useMemo(() => cards.filter((card) => {
    const keys = [card.id, card.card_id, card.entityKey, card.name].filter(Boolean).map(normalize);
    return keys.some((key) => ownedKeys.has(key));
  }), [cards, ownedKeys]);

  const filtered = useMemo(() => {
    const needle = normalize(search);
    return ownedCards.filter((card) => {
      if (rarity !== "all" && getRarity(card) !== rarity) return false;
      if (favoritesOnly && !favoriteKeys.has(String(card.id || card.card_id || card.entityKey || card.name))) return false;
      if (!needle) return true;
      return [getName(card), card.collection, card.collectionCode, card.series].some((value) => normalize(value).includes(needle));
    });
  }, [ownedCards, search, rarity, favoritesOnly, favoriteKeys]);

  const formsUnlocked = useMemo(() => ownedCards.reduce((total, card) => {
    if (!Array.isArray(card.forms)) return total;
    return total + card.forms.filter((form) => form?.unlocked === true || form?.owned === true).length;
  }, 0), [ownedCards]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-secondary"><ShieldCheck className="h-4 w-4" /> Minha coleção</div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-5xl">Seu acervo, sem ruído.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Personagens recebidos permanecem uma única carta. Quando uma transformação válida é desbloqueada, ela amplia a mesma identidade em vez de criar outra entrada.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Summary value={isAuthenticated ? ownedCards.length : "—"} label="personagens" />
              <Summary value={formsUnlocked} label="formas" />
              <Summary value={cards.length ? `${Math.round((ownedCards.length / cards.length) * 100)}%` : "0%"} label="completo" />
            </div>
          </div>
        </section>

        {!isAuthenticated ? (
          <section className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 px-6 text-center">
            <UserRound className="mb-4 h-9 w-9 text-muted-foreground/40" />
            <h2 className="text-xl font-black text-foreground">Entre para ver sua coleção</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">O catálogo público continua disponível sem login. Sua posse e seus desbloqueios dependem de uma sessão autenticada.</p>
            <Link to="/collections" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-border bg-card px-4 text-sm font-extrabold text-foreground hover:border-primary/45">Explorar catálogo</Link>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-2xl border border-border bg-card/70 p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar na minha coleção..." className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary/60" />
                </label>
                <select value={rarity} onChange={(event) => setRarity(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none">
                  <option value="all">Todas as raridades</option>
                  {RARITIES.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <button type="button" onClick={() => setFavoritesOnly((value) => !value)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-extrabold transition ${favoritesOnly ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}><Heart className="h-4 w-4" /> Favoritos</button>
              </div>
            </section>

            {cardsQuery.isLoading || rosterQuery.isLoading ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl border border-border bg-card" />)}</div>
            ) : filtered.length ? (
              <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                {filtered.map((card, index) => <OwnedCard key={card.id || card.entityKey || `${getName(card)}-${index}`} card={card} />)}
              </section>
            ) : (
              <section className="mt-6 flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 text-center"><ImageOff className="mb-3 h-8 w-8 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">Nenhuma carta possuída corresponde aos filtros atuais.</p></section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Summary({ value, label }) {
  return <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-center"><div className="text-xl font-black text-foreground">{value}</div><div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</div></div>;
}

function OwnedCard({ card }) {
  const image = getImage(card);
  const forms = Array.isArray(card.forms) ? card.forms : [];
  const unlocked = forms.filter((form) => form?.unlocked === true || form?.owned === true).length;
  return (
    <Link to={card.id ? `/card/${card.id}` : "/characters"} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/45">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {image ? <img src={image} alt={getName(card)} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" /> : <div className="absolute inset-0 flex items-center justify-center"><ImageOff className="h-8 w-8 text-muted-foreground/30" /></div>}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-100 backdrop-blur"><Check className="h-3 w-3" /> Possuído</div>
        <div className="absolute inset-x-3 bottom-3"><h3 className="line-clamp-2 text-sm font-black leading-tight text-white">{getName(card)}</h3><div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-white/60"><span>{getRarity(card) || card.collectionCode || "DeckVerse"}</span>{unlocked > 0 && <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> {unlocked} formas</span>}</div></div>
      </div>
    </Link>
  );
}
