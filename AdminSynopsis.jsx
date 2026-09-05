import React from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';
import Navbar from './Navbar';
import SynopsisAdminPanel from './src/components/admin/SynopsisAdminPanel.jsx';

export default function AdminSynopsis() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-7 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-primary/25 bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-primary"><ShieldCheck className="h-4 w-4" /> Administração · Conteúdo</div>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-black tracking-[-.04em] sm:text-5xl"><BookOpen className="h-8 w-8 text-primary sm:h-10 sm:w-10" /> Sinopses do Códice</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Crie e edite sinopses canônicas diretamente no catálogo. O acesso é restrito a administradores e cada alteração fica registrada no audit log.</p>
        </section>

        <section className="mt-6">
          <SynopsisAdminPanel />
        </section>
      </main>
    </div>
  );
}
