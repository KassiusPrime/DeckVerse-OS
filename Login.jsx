import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import DeckVerseLogo from "./DeckVerseLogo";
import { useAuth } from "./AuthContext";

const firebaseMessage = (error) => {
  const code = String(error?.code || "");
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "E-mail ou senha inválidos.";
  if (code.includes("email-already-in-use")) return "Este e-mail já possui uma conta.";
  if (code.includes("weak-password")) return "Use uma senha com pelo menos 6 caracteres.";
  if (code.includes("invalid-email")) return "Informe um e-mail válido.";
  if (code.includes("popup-closed")) return "O login Google foi cancelado.";
  return error?.message || "Não foi possível concluir a autenticação.";
};

export default function Login() {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn, signUp, signInWithGoogle, isAuthenticated, isOwner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = useMemo(() => {
    const value = new URLSearchParams(location.search).get("returnTo") || "/collections";
    return value.startsWith("/") && !value.startsWith("//") ? value : "/collections";
  }, [location.search]);

  React.useEffect(() => {
    if (isAuthenticated) navigate(isOwner && returnTo === "/owner" ? "/owner" : returnTo, { replace: true });
  }, [isAuthenticated, isOwner, navigate, returnTo]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(firebaseMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(firebaseMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        <div className="mb-7 flex justify-center"><DeckVerseLogo size="lg" showTagline={false} /></div>

        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,.28)]">
          <div className="border-b border-border p-6 text-center">
            <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Conta DeckVerse</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">{mode === "signup" ? "Criar sua conta" : "Entrar"}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Seu acervo, favoritos e progresso ficam vinculados à sua conta Firebase.</p>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-5 grid grid-cols-2 rounded-xl border border-border bg-background p-1">
              <button type="button" onClick={() => { setMode("signin"); setError(""); }} className={`min-h-10 rounded-lg text-sm font-extrabold transition ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Entrar</button>
              <button type="button" onClick={() => { setMode("signup"); setError(""); }} className={`min-h-10 rounded-lg text-sm font-extrabold transition ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Criar conta</button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <label className="block"><span className="mb-1.5 block text-xs font-bold text-muted-foreground">Nome</span><input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none focus:border-primary/60" placeholder="Como quer aparecer no DeckVerse" /></label>
              )}
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-muted-foreground">E-mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none focus:border-primary/60" placeholder="voce@exemplo.com" /></label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-muted-foreground">Senha</span>
                <div className="relative"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoComplete={mode === "signup" ? "new-password" : "current-password"} className="h-12 w-full rounded-xl border border-border bg-background px-4 pr-12 text-sm text-foreground outline-none focus:border-primary/60" placeholder="Mínimo de 6 caracteres" /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
              </label>

              {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

              <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground transition hover:brightness-110 disabled:opacity-50">{mode === "signup" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}{busy ? "Processando..." : mode === "signup" ? "Criar conta" : "Entrar"}</button>
            </form>

            <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-border" /><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">ou</span><div className="h-px flex-1 bg-border" /></div>
            <button type="button" onClick={google} disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-extrabold text-foreground transition hover:border-primary/40 hover:bg-muted/50 disabled:opacity-50">Continuar com Google</button>
          </div>
        </section>
      </div>
    </main>
  );
}
