import { db } from "@/base44Client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings as SettingsIcon, Palette, Globe, HelpCircle, Save, X, ChevronRight, Check, Sliders, ExternalLink, Type, Download, Upload, Trash2, AlertTriangle, Image, PackageOpen, Loader2, UserX } from "lucide-react";
import Navbar from "@/Navbar";
import { LANGUAGES, useI18n } from "@/i18n";
import { useToast } from "@/use-toast";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/AuthContext";

const PRESET_THEMES = [
{
  id: "default",
  name: "Cyber Dark",
  preview: { bg: "#0f1117", primary: "#00d4ff", accent: "#f5a623", secondary: "#8b5cf6" },
  vars: { "--background": "240 10% 8%", "--primary": "190 100% 50%", "--accent": "45 100% 55%", "--secondary": "270 60% 55%" }
},
{
  id: "crimson",
  name: "Crimson Night",
  preview: { bg: "#110a0a", primary: "#ef4444", accent: "#f97316", secondary: "#dc2626" },
  vars: { "--background": "0 20% 6%", "--primary": "0 84% 60%", "--accent": "24 95% 53%", "--secondary": "0 72% 51%" }
},
{
  id: "emerald",
  name: "Matrix Green",
  preview: { bg: "#050f0a", primary: "#10b981", accent: "#34d399", secondary: "#059669" },
  vars: { "--background": "150 40% 4%", "--primary": "160 84% 39%", "--accent": "151 70% 52%", "--secondary": "158 64% 34%" }
},
{
  id: "gold",
  name: "Golden Empire",
  preview: { bg: "#100d04", primary: "#f59e0b", accent: "#fbbf24", secondary: "#d97706" },
  vars: { "--background": "40 50% 4%", "--primary": "38 92% 50%", "--accent": "45 93% 47%", "--secondary": "32 81% 45%" }
},
{
  id: "sakura",
  name: "Sakura Wave",
  preview: { bg: "#0f0810", primary: "#ec4899", accent: "#f472b6", secondary: "#a855f7" },
  vars: { "--background": "280 20% 6%", "--primary": "330 81% 60%", "--accent": "322 81% 70%", "--secondary": "271 81% 55%" }
},
{
  id: "ocean",
  name: "Deep Ocean",
  preview: { bg: "#030c14", primary: "#0ea5e9", accent: "#38bdf8", secondary: "#0284c7" },
  vars: { "--background": "210 50% 5%", "--primary": "199 89% 48%", "--accent": "199 89% 60%", "--secondary": "200 89% 42%" }
}];

const FONTS = [
{ id: "orbitron", name: "Orbitron (Sci-Fi)", css: "'Orbitron', sans-serif", preview: "DECKVERSE OS" },
{ id: "firacode", name: "Fira Code (Hacker)", css: "'Fira Code', monospace", preview: "DECKVERSE OS" },
{ id: "inter", name: "Inter (Clean)", css: "'Inter', sans-serif", preview: "DECKVERSE OS" }];

const HELP_FAQ = [
{
  q: { pt: "Como ganhar Gems?", es: "¿Cómo ganar Gemas?", en: "How to earn Gems?" },
  a: { pt: "Complete missões diárias, vença batalhas na Arena e venda cartas no Mercado.", es: "Completa misiones diarias, gana batallas en la Arena y vende cartas en el Mercado.", en: "Complete daily quests, win Arena battles, and sell cards on the Market." }
},
{
  q: { pt: "Como criar uma guilda?", es: "¿Cómo crear un gremio?", en: "How to create a guild?" },
  a: { pt: "Vá em Guildas e clique em 'Criar Guilda'. Você precisa ter um perfil de jogador.", es: "Ve a Gremios y haz clic en 'Crear Gremio'. Necesitas tener un perfil de jugador.", en: "Go to Guilds and click 'Create Guild'. You need a player profile." }
},
{
  q: { pt: "O que são vantagens elementais?", es: "¿Qué son las ventajas elementales?", en: "What are elemental advantages?" },
  a: { pt: "Cada elemento tem um fraco: Fogo > Vento > Terra > Água > Fogo. Sombra > Luz e vice-versa.", es: "Cada elemento tiene una debilidad: Fuego > Viento > Tierra > Agua > Fuego. Sombra > Luz y viceversa.", en: "Each element has a weakness: Fire > Wind > Earth > Water > Fire. Shadow > Light and vice-versa." }
},
{
  q: { pt: "Como fazer upgrade de cartas?", es: "¿Cómo mejorar cartas?", en: "How to upgrade cards?" },
  a: { pt: "Vá em Upgrade, selecione uma carta do seu Roster e use Gems para aumentar o nível (máx. 10).", es: "Ve a Mejora, selecciona una carta de tu equipo y usa Gemas para subir el nivel (máx. 10).", en: "Go to Upgrade, select a card from your Roster and use Gems to level it up (max 10)." }
}];

function applyThemeVars(vars) {
  Object.entries(vars).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });
}

export default function Settings() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const importRef = useRef(null);

  const [currentLang, setCurrentLang] = useState(lang);
  const [activeTheme, setActiveTheme] = useState(localStorage.getItem("deckverse_theme") || "default");
  const [showHelp, setShowHelp] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [activeFont, setActiveFont] = useState(localStorage.getItem("deckverse_font") || "orbitron");
  const [customLogo, setCustomLogo] = useState(localStorage.getItem("deckverse_logo") || "");
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wipeStep, setWipeStep] = useState(0);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [customColors, setCustomColors] = useState({
    primary: "#00d4ff",
    bg: "#0f1117",
    accent: "#f5a623"
  });

  const [exporting, setExporting] = useState(false);

  // Fetch player + roster for backup
  const { data: players = [] } = useQuery({
    queryKey: ["settings-players"],
    queryFn: () => db.entities.Player.list(),
    enabled: !!user
  });
  const { data: roster = [] } = useQuery({
    queryKey: ["settings-roster"],
    queryFn: () => db.entities.Roster.list("-created_date", 500),
    enabled: !!user
  });

  const handleSaveLang = () => {
    localStorage.setItem("deckverse_lang", currentLang);
    toast({ title: "Idioma salvo! Recarregue a página." });
    setTimeout(() => window.location.reload(), 800);
  };

  const handleThemeSelect = (theme) => {
    setActiveTheme(theme.id);
    localStorage.setItem("deckverse_theme", theme.id);
    applyThemeVars(theme.vars);
    toast({ title: `Tema "${theme.name}" aplicado!` });
  };

  const applyFont = (fontId) => {
    const font = FONTS.find((f) => f.id === fontId);
    if (!font) return;
    document.documentElement.style.setProperty("--font-heading", font.css);
    if (fontId === "firacode") {
      // load Fira Code if needed
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
    setActiveFont(fontId);
    localStorage.setItem("deckverse_font", fontId);
    toast({ title: `Fonte "${font.name}" aplicada!` });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      // Limit to reasonable size
      if (result.length > 200000) {
        toast({ title: "Imagem muito grande. Use PNG/SVG com menos de 150KB.", variant: "destructive" });
        return;
      }
      setCustomLogo(result);
      localStorage.setItem("deckverse_logo", result);
      toast({ title: "Logo atualizada!" });
    };
    reader.readAsDataURL(file);
  };

  const handleExportBackup = () => {
    const player = players.find((p) => p.created_by === user?.email);
    const myRoster = roster.filter((r) => r.player_discord_id === (player?.discord_id || user?.email));
    const backup = {
      version_id: "2.0",
      exported_at: new Date().toISOString(),
      email: user?.email,
      wallet: { gems: player?.gems || 0, gold: player?.gold || 0 },
      inventory: myRoster,
      player: player || {},
      settings: {
        theme: localStorage.getItem("deckverse_theme"),
        font: localStorage.getItem("deckverse_font"),
        lang: localStorage.getItem("deckverse_lang")
      }
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    a.href = url;
    a.download = `deckverse_backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Backup exportado com sucesso!" });
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result);
        // Validate required keys
        if (!data.version_id || !data.wallet || !data.inventory) {
          toast({ title: "> ERRO_DADOS: Estrutura de backup inválida ou corrompida.", variant: "destructive" });
          return;
        }
        // Restore settings
        if (data.settings?.theme) localStorage.setItem("deckverse_theme", data.settings.theme);
        if (data.settings?.font) localStorage.setItem("deckverse_font", data.settings.font);
        if (data.settings?.lang) localStorage.setItem("deckverse_lang", data.settings.lang);
        toast({ title: `Backup v${data.version_id} importado! Recarregue para aplicar.` });
      } catch {
        toast({ title: "> ERRO_DADOS: Arquivo JSON inválido.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const handleFullExport = async () => {
    setExporting(true);
    try {
      // Fetch everything in parallel
      const [
      allCards,
      allCollections,
      allPlayers,
      allRoster,
      allBattleLogs,
      allGuilds,
      allGuildMembers,
      allItems,
      allPlayerItems,
      allChangelogs,
      allTradeRequests] =
      await Promise.all([
      db.entities.Card.list("-created_date", 2000),
      db.entities.Collection.list("-created_date", 500),
      db.entities.Player.list("-created_date", 500),
      db.entities.Roster.list("-created_date", 2000),
      db.entities.BattleLog.list("-created_date", 1000),
      db.entities.Guild.list("-created_date", 200),
      db.entities.GuildMember.list("-created_date", 1000),
      db.entities.Item.list("-created_date", 500),
      db.entities.PlayerItem.list("-created_date", 2000),
      db.entities.Changelog.list("-created_date", 100),
      db.entities.TradeRequest.list("-created_date", 500)]
      );

      const exportData = {
        meta: {
          export_version: "DECKVERSE_FULL_v1.0",
          exported_at: new Date().toISOString(),
          exported_by: user?.email,
          counts: {
            cards: allCards.length,
            collections: allCollections.length,
            players: allPlayers.length,
            roster: allRoster.length,
            battle_logs: allBattleLogs.length,
            guilds: allGuilds.length,
            guild_members: allGuildMembers.length,
            items: allItems.length,
            player_items: allPlayerItems.length,
            changelogs: allChangelogs.length,
            trade_requests: allTradeRequests.length
          }
        },
        ui_settings: {
          theme: localStorage.getItem("deckverse_theme"),
          font: localStorage.getItem("deckverse_font"),
          lang: localStorage.getItem("deckverse_lang"),
          custom_theme: localStorage.getItem("deckverse_custom_theme"),
          logo: localStorage.getItem("deckverse_logo")
        },
        data: {
          cards: allCards,
          collections: allCollections,
          players: allPlayers,
          roster: allRoster,
          battle_logs: allBattleLogs,
          guilds: allGuilds,
          guild_members: allGuildMembers,
          items: allItems,
          player_items: allPlayerItems,
          changelogs: allChangelogs,
          trade_requests: allTradeRequests
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.href = url;
      a.download = `deckverse_FULL_export_${date}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const total = Object.values(exportData.meta.counts).reduce((s, n) => s + n, 0);
      toast({ title: `✅ Exportação completa! ${total} registros + configurações de UI.` });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const player = players.find(p => p.created_by === user?.email);
    if (!player) {
      toast({ title: "Nenhum perfil de jogador encontrado.", variant: "destructive" });
      setShowDeleteAccount(false);
      return;
    }
    setDeletingAccount(true);
    await db.entities.Player.delete(player.id);
    // Clear local data
    Object.keys(localStorage).filter(k => k.startsWith("dv_") || k.startsWith("deckverse_"))
      .forEach(k => localStorage.removeItem(k));
    toast({ title: "Conta deletada. Redirecionando..." });
    setTimeout(() => window.location.href = "/", 1200);
    setDeletingAccount(false);
    setShowDeleteAccount(false);
  };

  const handleWipe = () => {
    if (wipeStep === 0) {setWipeStep(1);return;}
    // Full wipe
    const keys = ["deckverse_theme", "deckverse_font", "deckverse_lang", "deckverse_logo",
    "deckverse_pity", "deckverse_custom_theme", "dv_gift_daily", "dv_gift_weekly", "dv_gift_new_user",
    "deckverse_onboarding_done"];
    keys.forEach((k) => {
      // wipe all matching keys
      Object.keys(localStorage).filter((lk) => lk.startsWith("dv_") || lk.startsWith("deckverse_")).
      forEach((lk) => localStorage.removeItem(lk));
    });
    setShowWipeConfirm(false);
    setWipeStep(0);
    toast({ title: "Sistema resetado para o padrão de fábrica." });
    setTimeout(() => window.location.reload(), 800);
  };

  const handleApplyCustom = () => {
    function hexToHsl(hex) {
      let r = parseInt(hex.slice(1, 3), 16) / 255;
      let g = parseInt(hex.slice(3, 5), 16) / 255;
      let b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b),min = Math.min(r, g, b);
      let h,s,l = (max + min) / 2;
      if (max === min) {h = s = 0;} else
      {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:h = ((g - b) / d + (g < b ? 6 : 0)) / 6;break;
          case g:h = ((b - r) / d + 2) / 6;break;
          case b:h = ((r - g) / d + 4) / 6;break;
        }
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    }
    const vars = {
      "--primary": hexToHsl(customColors.primary),
      "--background": hexToHsl(customColors.bg),
      "--accent": hexToHsl(customColors.accent)
    };
    applyThemeVars(vars);
    localStorage.setItem("deckverse_custom_theme", JSON.stringify(customColors));
    setActiveTheme("custom");
    toast({ title: "Tema personalizado aplicado!" });
  };

  // Restore theme + font on load
  useEffect(() => {
    const savedTheme = localStorage.getItem("deckverse_theme");
    if (savedTheme === "custom") {
      const saved = localStorage.getItem("deckverse_custom_theme");
      if (saved) setCustomColors(JSON.parse(saved));
    } else if (savedTheme) {
      const theme = PRESET_THEMES.find((t) => t.id === savedTheme);
      if (theme) applyThemeVars(theme.vars);
    }
    // Restore font
    const savedFont = localStorage.getItem("deckverse_font");
    if (savedFont) {
      const font = FONTS.find((f) => f.id === savedFont);
      if (font) document.documentElement.style.setProperty("--font-heading", font.css);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-primary/20 bg-primary/10 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">{t("settings_title")}</h1>
              <p className="text-xs font-body text-muted-foreground tracking-widest">PERSONALIZAÇÃO & PREFERÊNCIAS</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Language */}
          <section className="border border-border/40 bg-card/30 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-primary" />
              <h2 className="font-heading text-xs font-bold tracking-widest text-foreground">{t("settings_language")}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(LANGUAGES).map(([code, label]) =>
              <button
                key={code}
                onClick={() => setCurrentLang(code)}
                className={`flex items-center gap-2 px-4 py-2 border font-body text-sm transition-all ${currentLang === code ? "border-primary/60 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:border-border/70"}`}>
                
                  {currentLang === code && <Check className="w-3 h-3" />}
                  {code === "pt" ? "🇧🇷" : code === "es" ? "🇪🇸" : "🇺🇸"} {label}
                </button>
              )}
            </div>
            {currentLang !== lang &&
            <button
              onClick={handleSaveLang}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-heading text-xs font-bold tracking-widest hover:bg-primary/80 transition-colors">
              
                <Save className="w-3.5 h-3.5" /> {t("settings_save")}
              </button>
            }
          </section>

          {/* Themes */}
          <section className="border border-border/40 bg-card/30 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-primary" />
              <h2 className="font-heading text-xs font-bold tracking-widest text-foreground">{t("settings_theme")}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESET_THEMES.map((theme) =>
              <button
                key={theme.id}
                onClick={() => handleThemeSelect(theme)}
                className={`relative border overflow-hidden transition-all ${activeTheme === theme.id ? "border-primary/60 ring-1 ring-primary/30" : "border-border/40 hover:border-border/70"}`}>
                
                  {/* Preview */}
                  <div className="h-14 relative" style={{ backgroundColor: theme.preview.bg }}>
                    <div className="absolute top-2 left-2 w-8 h-2 rounded" style={{ backgroundColor: theme.preview.primary }} />
                    <div className="absolute top-5 left-2 w-12 h-1.5 rounded opacity-60" style={{ backgroundColor: theme.preview.accent }} />
                    <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full opacity-50" style={{ backgroundColor: theme.preview.secondary }} />
                  </div>
                  <div className="px-2 py-1.5 bg-card/80 flex items-center justify-between">
                    <span className="font-heading text-[10px] font-bold text-foreground">{theme.name}</span>
                    {activeTheme === theme.id && <Check className="w-3 h-3 text-primary" />}
                  </div>
                </button>
              )}

              {/* Custom theme button */}
              <button
                onClick={() => setShowCustom(true)}
                className={`border overflow-hidden transition-all ${activeTheme === "custom" ? "border-accent/60 ring-1 ring-accent/30" : "border-border/40 border-dashed hover:border-border/70"}`}>
                
                <div className="h-14 bg-muted/20 flex items-center justify-center">
                  <Sliders className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <div className="px-2 py-1.5 bg-card/80 flex items-center justify-between">
                  <span className="font-heading text-[10px] font-bold text-muted-foreground">{t("settings_custom_theme")}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </button>
            </div>
          </section>

          {/* Font Selector */}
          <section className="border border-border/40 bg-card/30 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-4 h-4 text-primary" />
              <h2 className="font-heading text-xs font-bold tracking-widest text-foreground">FONTE DO SISTEMA</h2>
            </div>
            <div className="space-y-2">
              {FONTS.map((font) =>
              <button
                key={font.id}
                onClick={() => applyFont(font.id)}
                className={`w-full flex items-center justify-between px-4 py-3 border transition-all text-left ${activeFont === font.id ? "border-primary/60 bg-primary/10" : "border-border/40 hover:border-border/70"}`}>
                
                  <div>
                    <p style={{ fontFamily: font.css }} className="text-sm font-bold text-foreground">{font.preview}</p>
                    <p className="font-body text-[10px] text-muted-foreground mt-0.5">{font.name}</p>
                  </div>
                  {activeFont === font.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              )}
            </div>
            
          </section>

          {/* Custom Logo */}
          <section className="border border-border/40 bg-card/30 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-4 h-4 text-primary" />
              <h2 className="font-heading text-xs font-bold tracking-widest text-foreground">LOGO CUSTOMIZADA</h2>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {customLogo ?
              <div className="flex items-center gap-3">
                  <img src={customLogo} alt="Custom Logo" className="h-10 w-auto max-w-[200px] object-contain border border-border/30" />
                  <button onClick={() => {setCustomLogo("");localStorage.removeItem("deckverse_logo");toast({ title: "Logo removida." });}} className="text-[10px] font-heading text-destructive/60 hover:text-destructive border border-destructive/30 px-2 py-1">REMOVER</button>
                </div> :

              <p className="text-xs font-body text-muted-foreground/50">Nenhuma logo customizada.</p>
              }
              <label className="flex items-center gap-2 px-4 py-2 border border-border/50 text-xs font-heading text-muted-foreground hover:text-foreground hover:border-primary/40 cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" /> FAZER UPLOAD
                <input type="file" accept="image/png,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
            <p className="text-[10px] font-body text-muted-foreground/50 mt-2">PNG, SVG ou WEBP. Máx. 150KB. Será redimensionada para 200px de largura.</p>
          </section>

          {/* Backup & Restore */}
          <section className="border border-border/40 bg-card/30 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-4 h-4 text-primary" />
              <h2 className="font-heading text-xs font-bold tracking-widest text-foreground">BACKUP & RESTAURAÇÃO</h2>
            </div>
            <div className="space-y-4">

              {/* ── FULL EXPORT ─────────────────────────────── */}
              <div className="border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <PackageOpen className="w-4 h-4 text-primary" />
                  <span className="font-heading text-xs font-black tracking-widest text-primary">EXPORTAÇÃO COMPLETA DO PROJETO</span>
                </div>
                <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
                  Exporta <span className="text-foreground font-bold">tudo de uma só vez</span>: cartas, coleções, jogadores, roster, batalhas, guildas, itens, changelogs, trocas + todas as configurações de UI (tema, fonte, logo, idioma).
                </p>
                <button
                  onClick={handleFullExport}
                  disabled={exporting || !user}
                  className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-heading text-xs font-black tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-50 w-full sm:w-auto">
                  
                  {exporting ?
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> EXPORTANDO...</> :
                  <><PackageOpen className="w-3.5 h-3.5" /> EXPORTAR PROJETO COMPLETO</>
                  }
                </button>
              </div>

              {/* ── PROFILE BACKUP ──────────────────────────── */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExportBackup}
                  disabled={!user}
                  className="flex items-center gap-2 px-4 py-2.5 border border-border/50 text-xs font-heading text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-40">
                  
                  <Download className="w-3.5 h-3.5" /> BACKUP DE PERFIL
                </button>
                <label className="flex items-center gap-2 px-4 py-2.5 border border-border/50 text-xs font-heading text-muted-foreground hover:text-foreground hover:border-border/70 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" /> IMPORTAR BACKUP
                  <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
                </label>
              </div>
              <p className="text-[10px] font-body text-muted-foreground/50">
                Backup de perfil: gemas, inventário e preferências pessoais. Exportação completa: todos os dados do banco.
              </p>
            </div>
          </section>

          {/* Wipe Protocol */}
          <section className="border border-destructive/20 bg-destructive/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="w-4 h-4 text-destructive" />
              <h2 className="font-heading text-xs font-bold tracking-widest text-destructive">PROTOCOLO DE LIMPEZA</h2>
            </div>
            {!showWipeConfirm ?
            <button
              onClick={() => setShowWipeConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-destructive/40 text-xs font-heading text-destructive hover:bg-destructive/10 transition-colors">
              
                <Trash2 className="w-3.5 h-3.5" /> RESETAR CONFIGURAÇÕES
              </button> :

            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-3">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-xs font-body text-destructive">
                    {wipeStep === 0 ? "Isso irá resetar todas as preferências e cache local. Tem certeza?" : "CONFIRMAÇÃO FINAL: Todos os dados locais serão apagados permanentemente."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {setShowWipeConfirm(false);setWipeStep(0);}} className="px-4 py-2 border border-border/50 text-xs font-heading text-muted-foreground hover:text-foreground">CANCELAR</button>
                  <button onClick={handleWipe} className="px-4 py-2 border border-destructive/50 bg-destructive/10 text-xs font-heading text-destructive hover:bg-destructive/20">
                    {wipeStep === 0 ? "SIM, CONTINUAR" : "☠️ CONFIRMAR WIPE"}
                  </button>
                </div>
              </motion.div>
            }
          </section>

          {/* Delete Account */}
          <section className="border border-destructive/30 bg-destructive/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserX className="w-4 h-4 text-destructive" />
              <h2 className="font-heading text-xs font-bold tracking-widest text-destructive">DELETAR CONTA DE JOGADOR</h2>
            </div>
            {!showDeleteAccount ? (
              <div className="space-y-2">
                <p className="text-[11px] font-body text-muted-foreground">Remove permanentemente seu perfil de jogador, gemas, inventário e dados de batalha do banco de dados.</p>
                <button
                  onClick={() => setShowDeleteAccount(true)}
                  disabled={!user}
                  className="flex items-center gap-2 px-4 py-2.5 border border-destructive/50 text-xs font-heading text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                >
                  <UserX className="w-3.5 h-3.5" /> DELETAR MINHA CONTA
                </button>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center gap-2 border border-destructive/40 bg-destructive/10 p-3">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-xs font-body text-destructive font-bold">
                    AÇÃO IRREVERSÍVEL: Seu perfil, gemas, cartas e histórico serão deletados permanentemente. Não há como desfazer.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteAccount(false)} className="px-4 py-2.5 border border-border/50 text-xs font-heading text-muted-foreground hover:text-foreground">CANCELAR</button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="flex items-center gap-2 px-4 py-2.5 border border-destructive/60 bg-destructive/15 text-xs font-heading text-destructive hover:bg-destructive/25 disabled:opacity-50"
                  >
                    {deletingAccount ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> DELETANDO...</> : <><UserX className="w-3.5 h-3.5" /> ☠️ CONFIRMAR DELEÇÃO</>}
                  </button>
                </div>
              </motion.div>
            )}
          </section>

          {/* Help */}
          <section className="border border-border/40 bg-card/30 p-5">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-between w-full">
              
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                <h2 className="font-heading text-xs font-bold tracking-widest text-foreground">{t("settings_help")}</h2>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showHelp ? "rotate-90" : ""}`} />
            </button>

            <AnimatePresence>
              {showHelp &&
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                
                  <div className="pt-4 space-y-2">
                    {HELP_FAQ.map((item, i) =>
                  <div key={i} className="border border-border/30 overflow-hidden">
                        <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/10 transition-colors">
                      
                          <span className="font-heading text-xs font-bold text-foreground">{item.q[lang] || item.q.en}</span>
                          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${expandedFaq === i ? "rotate-90" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {expandedFaq === i &&
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden">
                        
                              <p className="px-4 pb-3 text-sm font-body text-muted-foreground">{item.a[lang] || item.a.en}</p>
                            </motion.div>
                      }
                        </AnimatePresence>
                      </div>
                  )}

                    <div className="mt-3 flex items-center gap-2 text-xs font-body text-muted-foreground border border-border/30 p-3">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ainda com dúvidas? Entre no nosso servidor do Discord para suporte.
                    </div>
                  </div>
                </motion.div>
              }
            </AnimatePresence>
          </section>
        </div>
      </div>

      {/* Custom Theme Modal */}
      <AnimatePresence>
        {showCustom &&
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowCustom(false)}>
          
            <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-card border border-border/60 p-6 w-full max-w-sm space-y-5">
            
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-sm font-black tracking-widest">{t("settings_custom_theme")}</h2>
                <button onClick={() => setShowCustom(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live preview */}
              <div className="h-20 border border-border/30 relative overflow-hidden" style={{ backgroundColor: customColors.bg }}>
                <div className="absolute top-3 left-3 w-16 h-3 rounded" style={{ backgroundColor: customColors.primary }} />
                <div className="absolute top-8 left-3 w-24 h-2 rounded opacity-50" style={{ backgroundColor: customColors.primary }} />
                <div className="absolute bottom-3 right-3 px-3 py-1 rounded text-[10px] font-heading" style={{ backgroundColor: customColors.accent, color: "#000" }}>BUTTON</div>
                <div className="absolute bottom-3 left-3 w-6 h-6 rounded-full opacity-40" style={{ backgroundColor: customColors.accent }} />
              </div>

              {[
            { key: "bg", label: t("settings_bg_color") },
            { key: "primary", label: t("settings_primary_color") },
            { key: "accent", label: t("settings_accent_color") }].
            map(({ key, label }) =>
            <div key={key} className="flex items-center justify-between">
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground">{label}</label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{customColors[key]}</span>
                    <input
                  type="color"
                  value={customColors[key]}
                  onChange={(e) => setCustomColors((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-10 h-8 cursor-pointer border border-border/40 bg-transparent" />
                
                  </div>
                </div>
            )}

              <button
              onClick={handleApplyCustom}
              className="w-full py-2.5 bg-primary text-primary-foreground font-heading text-xs font-bold tracking-widest hover:bg-primary/80 transition-colors">
              
                APLICAR TEMA
              </button>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}