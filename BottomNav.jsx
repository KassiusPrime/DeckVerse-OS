import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Layers, Package, ShieldCheck, Sparkles, UserRound } from "lucide-react";

const LINKS = [
  { to: "/", label: "Início", icon: Home },
  { to: "/collections", label: "Coleções", icon: Layers },
  { to: "/characters", label: "Personagens", icon: UserRound },
  { to: "/forms", label: "Formas", icon: Sparkles },
  { to: "/items", label: "Itens", icon: Package },
  { to: "/my-collection", label: "Acervo", icon: ShieldCheck },
];

export default function BottomNav() {
  const location = useLocation();
  if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/adm")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/92 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegação móvel"
    >
      <div className="mx-auto grid max-w-xl grid-cols-6 gap-0.5 px-1.5 py-1.5">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex min-h-[54px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[9px] font-bold transition ${
                isActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
