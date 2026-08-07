import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Arena() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/collections", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <p className="font-heading text-sm font-bold text-cyan-400 uppercase tracking-wider animate-pulse">
          Redirecionando para a Biblioteca de Coleções...
        </p>
        <p className="text-xs font-mono text-muted-foreground">DeckVerse OS — TCG Card Collection Mode</p>
      </div>
    </div>
  );
}