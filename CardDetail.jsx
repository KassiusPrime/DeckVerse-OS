import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ImageOff, Lock, Package, Sparkles, Swords, UserRound } from 'lucide-react';
import Navbar from './Navbar';
import { loadCatalogSnapshot } from './services/catalog/catalogDataService.js';
import { deriveCatalogForms } from './services/catalog/catalogFormsService.js';

const getName = (entity) => entity?.name || entity?.title || 'Sem nome';
const getRarity = (entity) => String(entity?.rarity || '').toUpperCase();
const normalize = (value) => String(value || '').trim().toLowerCase();
const entityLabel = (entity) => entity?.entity_type === 'item' ? 'Item' : entity?.entity_type === 'boss' ? 'Boss' : 'Personagem';
const entityIcon = (entity) => entity?.entity_type === 'item' ? Package : entity?.entity_type === 'boss' ? Swords : UserRound;

export default function CardDetail() {
  const { id } = useParams();
  const [selectedFormId, setSelectedFormId] = useState('base');
  const snapshotQuery = useQuery({ queryKey: ['catalog-snapshot-canonical'], queryFn: loadCatalogSnapshot, staleTime: 5 * 60_000 });
  const snapshot = snapshotQuery.data || { characters: [], items: [], bosses: [] };
  const allEntities = useMemo(() => [...(snapshot.characters || []), ...(snapshot.items || []), ...(snapshot.bosses || [])], [snapshot]);
  const entity = useMemo(() => allEntities.find((entry) => String(entry?.id || entry?.card_id || '') === String(id)) || null, [allEntities, id]);
  const allForms = useMemo(() => deriveCatalogForms(snapshot), [snapshot]);

  const forms = useMemo(() => {
    if (!entity || entity.entity_type === 'item') return [];
    const entityId = String(entity.id || entity.card_id || '');
    const entityName = normalize(getName(entity));
    const entityType = entity.entity_type === 'boss' ? 'boss' : 'character';
    return allForms.filter((form) => {
      const formEntityId = String(form.baseEntityId || form.baseCharacterId || '');
      return (formEntityId === entityId || normalize(form.baseName) === entityName) && (!form.entityType || form.entityType === entityType);
    }).map((form, index) => ({
      ...form,
      id: form.id || `form-${index}`,
      name: form.name || `Forma ${index + 1}`,
      image: form.image_url || form.imageUrl || '',
      locked: form.locked === true || form.unlocked === false,
      order: Number.isFinite(Number(form.order)) ? Number(form.order) : index + 1,
    })).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'));
  }, [allForms, entity]);

  React.useEffect(() => setSelectedFormId('base'), [id]);
  if (snapshotQuery.isLoading) return <Loading />;
  if (!entity) return <NotFound />;

  const selectedForm = selectedFormId === 'base' ? null : forms.find((form) => form.id === selectedFormId) || null;
  const image = selectedForm?.image || entity.image_url || entity.imageUrl || '';
  const activeLabel = selectedForm?.name || 'Base';
  const rarity = getRarity(selectedForm) || getRarity(entity);
  const collectionName = entity.collection || entity.series || 'DeckVerse';
  const collectionId = entity.collection_id || entity.collectionCode || '';
  const EntityIcon = entityIcon(entity);
  const synopsis = selectedForm?.synopsis || entity.synopsis || '';
  const extendedLore = selectedForm?.description || entity.description || entity.lore || '';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Link to={collectionId ? `/collections/${encodeURIComponent(collectionId)}` : '/collections'} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted-foreground hover:bg-muted/50 hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar à coleção</Link>
          {forms.length > 0 && <Link to="/forms" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted-foreground hover:bg-muted/50 hover:text-primary"><Sparkles className="h-4 w-4" /> Todas as formas</Link>}
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,460px)_1fr] lg:gap-10">
          <section>
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,.28)]">
              <div className="relative aspect-[4/5] bg-muted">
                {image ? <img key={`${selectedFormId}-${image}`} src={image} alt={`${getName(entity)} — ${activeLabel}`} loading="eager" decoding="async" className="h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.15),transparent_65%)]"><ImageOff className="h-10 w-10 text-muted-foreground/35" /></div>}
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/94 via-black/38 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3"><div><div className="text-[10px] font-extrabold uppercase tracking-[.16em] text-white/55">{forms.length > 0 ? 'Estado canônico' : entityLabel(entity)}</div><div className="mt-1 text-lg font-black text-white">{forms.length > 0 ? activeLabel : getName(entity)}</div></div>{rarity && <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-black tracking-[.12em] text-white backdrop-blur">{rarity}</span>}</div>
              </div>
            </div>

            {forms.length > 0 && <div className="mt-4 rounded-2xl border border-border bg-card p-3"><div className="mb-3 flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-[.14em] text-muted-foreground"><Sparkles className="h-4 w-4 text-primary" /> Formas vinculadas</div><div className="flex gap-2 overflow-x-auto pb-1"><FormButton label="Base" active={selectedFormId === 'base'} onClick={() => setSelectedFormId('base')} />{forms.map((form) => <FormButton key={form.id} label={form.name} locked={form.locked} active={selectedFormId === form.id} onClick={() => !form.locked && setSelectedFormId(form.id)} />)}</div></div>}
          </section>

          <section className="min-w-0 lg:pt-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.16em] text-primary"><EntityIcon className="h-4 w-4" /> {entityLabel(entity)} · {collectionName}</div>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">{getName(entity)}</h1>
            <div className="mt-5 flex flex-wrap gap-2">
              {rarity && <MetaChip label="Raridade" value={rarity} />}
              {!rarity && entity.rarityReviewed === false && <MetaChip label="Raridade" value="Em revisão" />}
              {entity.role && <MetaChip label="Núcleo" value={entity.role} />}
              {forms.length > 0 && <MetaChip label="Formas" value={String(forms.length)} />}
            </div>

            <div className="mt-7 rounded-2xl border border-primary/20 bg-card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[.14em]"><BookOpen className="h-4 w-4 text-primary" /> Sinopse de códice</h2>
              <p className="mt-3 text-[15px] font-medium leading-7 text-foreground/90">{synopsis || 'Sinopse editorial em revisão.'}</p>
            </div>

            {extendedLore && extendedLore !== synopsis && <details className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6"><summary className="cursor-pointer text-sm font-black uppercase tracking-[.14em]">Lore estendida</summary><p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">{extendedLore}</p></details>}

            {forms.length > 0 && <div className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black uppercase tracking-[.14em]">Linhas de transformação</h2><p className="mt-1 text-xs text-muted-foreground">A identidade-base permanece única; cada forma registra um estado canônico e sua própria sinopse.</p></div><Sparkles className="h-5 w-5 shrink-0 text-primary" /></div><div className="mt-4 space-y-2"><ProgressRow name="Base" unlocked />{forms.map((form) => <ProgressRow key={form.id} name={form.name} unlocked={!form.locked} />)}</div></div>}
          </section>
        </div>
      </main>
    </div>
  );
}

function Loading() { return <div className="min-h-screen bg-background"><Navbar /><main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,460px)_1fr] lg:px-8"><div className="aspect-[4/5] animate-pulse rounded-3xl border border-border bg-card" /><div className="space-y-4"><div className="h-10 w-2/3 animate-pulse rounded-xl bg-card" /><div className="h-5 w-1/3 animate-pulse rounded-xl bg-card" /><div className="h-32 animate-pulse rounded-2xl bg-card" /></div></main></div>; }
function NotFound() { return <div className="min-h-screen bg-background"><Navbar /><main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center"><ImageOff className="h-10 w-10 text-muted-foreground/40" /><h1 className="mt-4 text-2xl font-black">Entidade não encontrada</h1><p className="mt-2 text-sm text-muted-foreground">Ela pode ter sido removida, desativada ou ainda não estar sincronizada.</p><Link to="/collections" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-extrabold"><ArrowLeft className="h-4 w-4" /> Voltar às coleções</Link></main></div>; }
function FormButton({ label, active, locked, onClick }) { return <button type="button" onClick={onClick} disabled={locked} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition ${active ? 'border-primary/55 bg-primary/12 text-primary' : locked ? 'cursor-not-allowed border-border bg-background/50 text-muted-foreground/45' : 'border-border bg-background text-muted-foreground hover:border-primary/35 hover:text-foreground'}`}>{locked && <Lock className="h-3.5 w-3.5" />}{label}</button>; }
function MetaChip({ label, value }) { return <div className="rounded-xl border border-border bg-card px-3 py-2"><div className="text-[9px] font-bold uppercase tracking-[.13em] text-muted-foreground">{label}</div><div className="mt-0.5 text-xs font-extrabold">{value}</div></div>; }
function ProgressRow({ name, unlocked }) { return <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3"><span className="text-sm font-bold">{name}</span>{unlocked ? <span className="text-[11px] font-extrabold text-emerald-300">Catalogada</span> : <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Bloqueada</span>}</div>; }
