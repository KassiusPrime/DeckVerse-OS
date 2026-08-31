import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from './services/supabase/client.js';

const CALLBACK_TIMEOUT_MS = 10_000;

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Concluindo autenticação com o Discord…');

  useEffect(() => {
    let cancelled = false;
    let subscription = null;
    let timeoutId = null;

    const fail = (message) => {
      if (cancelled) return;
      setError(message || 'Não foi possível concluir o login com Discord.');
    };

    const finish = () => {
      if (cancelled) return;
      window.history.replaceState({}, document.title, '/auth/callback');
      navigate('/profile', { replace: true });
    };

    const run = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const searchParams = new URLSearchParams(window.location.search);
        const providerError = searchParams.get('error_description') || hashParams.get('error_description');
        if (providerError) {
          fail(decodeURIComponent(providerError.replace(/\+/g, ' ')));
          return;
        }

        const supabase = getSupabaseBrowserClient();
        const code = searchParams.get('code');

        if (code) {
          setStatus('Validando o código de acesso…');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // detectSessionInUrl may have completed the exchange first. Only fail if
            // there is still no valid session below.
            console.warn('[DeckVerse Auth] callback code exchange warning', exchangeError.message);
          }
        }

        setStatus('Carregando sua sessão DeckVerse…');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (sessionData?.session?.user) {
          finish();
          return;
        }

        subscription = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) finish();
        }).data.subscription;

        timeoutId = window.setTimeout(async () => {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) finish();
          else fail('O Discord autorizou a conta, mas a sessão não chegou ao navegador. Tente entrar novamente.');
        }, CALLBACK_TIMEOUT_MS);
      } catch (err) {
        fail(err?.message || 'Falha ao concluir a autenticação.');
      }
    };

    run();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      subscription?.unsubscribe?.();
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-center text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-2xl">
        {error ? (
          <>
            <h1 className="text-xl font-black">Não foi possível concluir o login</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{error}</p>
            <button type="button" onClick={() => navigate('/login', { replace: true })} className="mt-6 min-h-11 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">Tentar novamente</button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-black">Sincronizando sua conta</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground" aria-live="polite">{status}</p>
          </>
        )}
      </div>
    </main>
  );
}
