import React, { useEffect, useMemo, useState } from 'react';

const DISMISS_KEY = 'deckverse:pwa-install-dismissed';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [standalone, setStandalone] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const ios = useMemo(isIos, []);

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setStandalone(true);
    };
    const media = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayMode = () => setStandalone(isStandalone());

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    media?.addEventListener?.('change', onDisplayMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      media?.removeEventListener?.('change', onDisplayMode);
    };
  }, []);

  if (standalone || dismissed || (!installEvent && !ios)) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* no-op */ }
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') setInstallEvent(null);
  };

  return (
    <aside
      className="fixed bottom-24 left-3 right-3 z-[70] mx-auto max-w-md rounded-2xl border border-primary/30 bg-background/95 p-4 shadow-2xl backdrop-blur md:bottom-6 md:left-auto md:right-6"
      role="status"
      aria-label="Instalar DeckVerse"
    >
      <div className="flex items-start gap-3">
        <img src="/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Instalar DeckVerse</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {ios
              ? 'No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.'
              : 'Instale o DeckVerse como aplicativo para abrir em uma janela própria, sem depender do atalho do navegador.'}
          </p>
          <div className="mt-3 flex gap-2">
            {!ios && installEvent ? (
              <button
                type="button"
                onClick={install}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Instalar app
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
