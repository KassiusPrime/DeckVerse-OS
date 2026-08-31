import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, authError } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) navigate('/profile', { replace: true });
  }, [isAuthenticated, isLoadingAuth, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-center text-foreground">
      <div className="max-w-md rounded-3xl border border-border bg-card p-8">
        {authError ? (
          <>
            <h1 className="text-xl font-black">Não foi possível concluir o login</h1>
            <p className="mt-3 text-sm text-muted-foreground">{authError.message}</p>
            <button type="button" onClick={() => navigate('/login', { replace: true })} className="mt-6 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">Voltar ao login</button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-black">Sincronizando sua conta</h1>
            <p className="mt-2 text-sm text-muted-foreground">Validando a sessão do Discord e carregando seu perfil DeckVerse.</p>
          </>
        )}
      </div>
    </main>
  );
}
