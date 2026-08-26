import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Layers, ShieldCheck, Skull, UserRound } from "lucide-react";

const LINKS = [
  { to: "/", label: "Início", icon: Home },
  { to: "/collections", label: "Coleções", icon: Layers },
  { to: "/characters", label: "Personagens", icon: UserRound },
  { to: "/bosses", label: "Bosses", icon: Skull },
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
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2 py-1.5">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition ${
                isActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
