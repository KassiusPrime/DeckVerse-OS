import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Navbar from './Navbar';
import getAcervoCollections from './services/acervo/useCases/getAcervoCollections.js';

export default function AcervoCollection() {
  const { collectionId } = useParams();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getAcervoCollections().then((items) => {
      const id = decodeURIComponent(collectionId || '');
      if (alive) setCollection((items || []).find((item) => String(item.id) === id) || null);
    }).catch(() => {
      if (alive) setCollection(null);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [collectionId]);

  return <><Navbar/><main className="min-h-screen bg-background px-4 pb-24 pt-6 text-foreground sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1500px]">
      <Link to="/acervo" className="inline-flex items-center gap-2 text-xs font-black text-primary"><ArrowLeft className="h-4 w-4"/>Voltar ao Acervo</Link>
      {loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div> :
        !collection ? <div className="mt-6 rounded-3xl border border-border bg-card p-10 text-center"><BookOpen className="mx-auto h-10 w-10 text-muted-foreground"/><h1 className="mt-4 text-xl font-black">Coleção não encontrada</h1></div> :
        <header className="mt-6 overflow-hidden rounded-3xl border border-border bg-card"><div className="aspect-[5/1] min-h-40 overflow-hidden bg-muted">{collection.cover_url && <img src={collection.cover_url} alt="" className="h-full w-full object-cover"/>}</div><div className="p-6"><p className="text-[10px] font-black uppercase tracking-[.16em] text-primary">Coleção</p><h1 className="mt-2 text-3xl font-black">{collection.name}</h1><p className="mt-2 text-sm text-muted-foreground">{collection.synopsis || collection.description || 'Editor de produtividade da coleção.'}</p><div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">A estrutura da coleção está pronta. A grade de Cartas, Formas e Itens, edição inline, busca, ações em lote e o fluxo Salvar e Próximo entram no próximo bloco.</div></div></header>}
    </div>
  </main></>;
}
