import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/base44Client";
import { fandomClient } from "@/services/fandom/fandomClient";
import { enrichmentService } from "@/services/ai/enrichmentService";
import { dataQualityEngine } from "@/services/ai/dataQualityEngine";
import { Input } from "@/input";
import { Textarea } from "@/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/select";
import { useToast } from "@/use-toast";
import {
  Search, Sparkles, Database, Check, RefreshCw, Layers, Shield,
  ExternalLink, ChevronRight, User, Zap, BookOpen, AlertCircle
} from "lucide-react";

export default function FandomImporter() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWiki, setSelectedWiki] = useState("naruto");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // States for extraction & AI draft
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [rawFandomData, setRawFandomData] = useState(null);
  const [draft, setDraft] = useState(null);

  // Form selections
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");
  const [cardRarity, setCardRarity] = useState("SSR");
  const [cardRole, setCardRole] = useState("DPS");

  const { data: franchises = [] } = useQuery({
    queryKey: ["admin-franchises"],
    queryFn: () => db.entities.Franchise.list(),
  });

  const { data: archetypes = [] } = useQuery({
    queryKey: ["admin-archetypes"],
    queryFn: () => db.entities.Archetype.list(),
  });

  const { data: personalities = [] } = useQuery({
    queryKey: ["admin-personalities"],
    queryFn: () => db.entities.Personality.list(),
  });

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await fandomClient.searchCharacter(searchQuery, selectedWiki);
      setSearchResults(results);
    } catch (err) {
      toast({ title: "Erro na busca", description: err.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCharacter = async (item) => {
    setIsLoadingDraft(true);
    setRawFandomData(null);
    setDraft(null);

    try {
      // 1. Extrai dados brutos da Fandom API
      const fandomData = await fandomClient.fetchCharacterInfobox(item.title, item.wikiSlug);
      setRawFandomData(fandomData);

      // 2. Processa com IA Gemini para gerar Rascunho
      const enrichedDraft = await enrichmentService.enrichCharacterData(fandomData);
      setDraft(enrichedDraft);

      // Tenta associar franquia por slug
      const matchedFranchise = franchises.find(f => f.slug?.toLowerCase().includes(item.wikiSlug.toLowerCase()) || f.name.toLowerCase().includes(item.wikiName.toLowerCase()));
      if (matchedFranchise) {
        setSelectedFranchiseId(matchedFranchise.id);
      } else if (franchises.length > 0) {
        setSelectedFranchiseId(franchises[0].id);
      }
    } catch (err) {
      toast({ title: "Falha ao extrair dados", description: err.message, variant: "destructive" });
    } finally {
      setIsLoadingDraft(false);
    }
  };

  const handleApproveAndSave = async () => {
    if (!draft || !selectedFranchiseId) {
      toast({ title: "Atenção", description: "Selecione uma franquia para o personagem.", variant: "destructive" });
      return;
    }

    try {
      const charSlug = draft.canonical_name.toLowerCase().replace(/[^a-z0-9]/g, "_");

      // 1. Criar ou Atualizar Character (1 registro canônico)
      const characterData = {
        franchise_id: selectedFranchiseId,
        canonical_name: draft.canonical_name,
        gender: draft.gender || "Desconhecido",
        species: draft.species || "Humano",
        bio: draft.bio,
        fandom_url: rawFandomData?.fandomUrl || "",
        archetype_ids: draft.archetype_ids || [],
        personality_ids: draft.personality_ids || [],
        catchphrases: draft.catchphrases || [],
        motivations: draft.motivations || "",
        fears: draft.fears || "",
        moral_alignment: draft.moral_alignment || "",
        voice_tone: draft.voice_tone || "",
        status: "verified"
      };

      const existingChars = await db.entities.Character.filter({ canonical_name: draft.canonical_name });
      let character;
      if (existingChars.length > 0) {
        character = await db.entities.Character.update(existingChars[0].id, characterData);
      } else {
        character = await db.entities.Character.create(characterData);
      }

      // 2. Criar CharacterVersion
      const versionData = {
        character_id: character.id,
        version_name: "Base / Canônico",
        description: draft.bio,
        img_avatar: rawFandomData?.mainImageUrl || "",
        img_art: rawFandomData?.mainImageUrl || "",
        img_banner: rawFandomData?.mainImageUrl || "",
        img_icon: rawFandomData?.mainImageUrl || "",
        img_thumbnail: rawFandomData?.mainImageUrl || "",
        stats: draft.stats,
        movepool: draft.movepool
      };
      const version = await db.entities.CharacterVersion.create(versionData);

      // 3. Criar Card jogável
      const selectedFranchise = franchises.find(f => f.id === selectedFranchiseId);
      const franchiseCode = selectedFranchise?.slug || "FND";
      const cardIdCode = `${franchiseCode}-CHR-${cardRarity}-${Math.floor(100 + Math.random() * 899)}`;

      const cardData = {
        name: draft.canonical_name,
        card_id: cardIdCode,
        collection_id: franchiseCode,
        character_version_id: version.id,
        rarity: cardRarity,
        role: cardRole,
        gender: draft.gender || "Unknown",
        tags: [selectedFranchise?.name || "Fandom", ...(draft.archetype_ids || [])],
        attack: draft.stats?.strength || 80,
        defense: draft.stats?.resistance || 75,
        speed: draft.stats?.speed || 80,
        hp: (draft.stats?.strength || 80) * 4,
        mag: draft.stats?.energy || 80,
        img_oficial: rawFandomData?.mainImageUrl || "",
        lore: draft.bio,
        version: "Base / Canônico",
        skills: (draft.movepool || []).map(m => ({ name: m.name, description: m.desc, type: m.type }))
      };

      const savedCard = await db.entities.Card.create(cardData);

      // Executa validação de qualidade imediata
      try {
        await dataQualityEngine.runDataQualityAudit();
      } catch (e) {
        console.warn("Quality audit error on import:", e);
      }

      qc.invalidateQueries();
      toast({ title: "🎉 Importação Concluída!", description: `${draft.canonical_name} cadastrado no Banco de Conhecimento com sucesso!` });

      // Reseta estado
      setDraft(null);
      setRawFandomData(null);
    } catch (err) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const toggleArchetype = (archId) => {
    if (!draft) return;
    const current = draft.archetype_ids || [];
    const next = current.includes(archId) ? current.filter(id => id !== archId) : [...current, archId];
    setDraft({ ...draft, archetype_ids: next });
  };

  const togglePersonality = (persId) => {
    if (!draft) return;
    const current = draft.personality_ids || [];
    const next = current.includes(persId) ? current.filter(id => id !== persId) : [...current, persId];
    setDraft({ ...draft, personality_ids: next });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-primary/30 bg-primary/5 p-4 rounded-lg flex items-center justify-between">
        <div>
          <h2 className="font-heading text-sm font-bold text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> IMPORTAÇÃO AUTOMÁTICA DA FANDOM + GEMINI IA
          </h2>
          <p className="text-xs font-body text-muted-foreground mt-1">
            Busque qualquer personagem em wikis Fandom. A extração inicial é 100% gratuita via API REST e o enriquecimento é gerado pelo Gemini 2.5.
          </p>
        </div>
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedWiki} onValueChange={setSelectedWiki}>
          <SelectTrigger className="w-full sm:w-48 bg-muted/20 border-border/50 text-xs font-heading">
            <SelectValue placeholder="Escolha a Wiki" />
          </SelectTrigger>
          <SelectContent>
            {fandomClient.DEFAULT_WIKIS.map(w => (
              <SelectItem key={w.slug} value={w.slug}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Digite o nome do personagem (ex: Wolverine, Gojo, Zoro, Batman)..."
          className="flex-1 font-body text-xs bg-muted/20 border-border/50"
        />

        <button
          type="submit"
          disabled={isSearching}
          className="px-5 py-2 bg-primary text-primary-foreground font-heading text-xs font-bold tracking-wider hover:bg-primary/80 transition-colors shrink-0 flex items-center justify-center gap-2 rounded"
        >
          {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          BUSCAR FANDOM
        </button>
      </form>

      {/* Lista de Resultados */}
      {searchResults.length > 0 && !draft && (
        <div className="space-y-3">
          <h3 className="font-heading text-xs font-bold text-muted-foreground tracking-wider uppercase">
            — Candidatos Encontrados ({searchResults.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchResults.map((item, idx) => (
              <div key={idx} className="border border-border/40 bg-card/40 p-3 rounded flex flex-col justify-between gap-3 hover:border-primary/50 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-sm font-bold text-foreground">{item.title}</span>
                    <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded">
                      {item.wikiName}
                    </span>
                  </div>
                  <p className="text-xs font-body text-muted-foreground mt-1 line-clamp-2">{item.snippet}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/20">
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-[10px] font-heading text-muted-foreground hover:text-primary flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Abrir Wiki
                  </a>
                  <button
                    onClick={() => handleSelectCharacter(item)}
                    disabled={isLoadingDraft}
                    className="px-3 py-1 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/40 rounded text-xs font-heading font-bold transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> IMPORTAR & ENRIQUECER
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carregando Rascunho */}
      {isLoadingDraft && (
        <div className="border border-primary/30 bg-primary/5 p-8 rounded text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <h3 className="font-heading text-sm font-bold text-foreground">PROCESSANDO PIPELINE DA FANDOM & GEMINI IA...</h3>
          <p className="text-xs font-body text-muted-foreground">
            Extraindo wikitext, imagens oficiais do infobox e executando classificação de arquétipos e atributos...
          </p>
        </div>
      )}

      {/* Painel de Revisão Lado a Lado com Rascunho */}
      {draft && (
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                STATUS: RASCUNHO PENDENTE DE REVISÃO
              </span>
              <h3 className="font-heading text-base font-black text-foreground">
                {draft.canonical_name}
              </h3>
            </div>
            <button
              onClick={() => setDraft(null)}
              className="text-xs font-heading text-muted-foreground hover:text-foreground border border-border/40 px-3 py-1 rounded"
            >
              DISCARD DRAFT
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lado Esquerdo: Dados extraídos da Fandom */}
            <div className="border border-border/40 bg-card/30 p-4 rounded-lg space-y-4">
              <h4 className="font-heading text-xs font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-primary" /> DADOS BRUTOS EXTRAÍDOS DA FANDOM
              </h4>

              {rawFandomData?.mainImageUrl && (
                <div className="relative aspect-video rounded overflow-hidden border border-border/40 bg-black/40">
                  <img src={rawFandomData.mainImageUrl} alt="Infobox" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="space-y-2 text-xs font-body">
                <div><strong className="text-muted-foreground">Wiki Origem:</strong> <span className="font-mono text-primary">{rawFandomData?.wikiSlug}</span></div>
                <div><strong className="text-muted-foreground">Espécie:</strong> {rawFandomData?.species}</div>
                <div><strong className="text-muted-foreground">Gênero:</strong> {rawFandomData?.gender}</div>
                <div><strong className="text-muted-foreground">Afiliações:</strong> {rawFandomData?.affiliations || "Não informado"}</div>
                <div>
                  <strong className="text-muted-foreground">Poderes Brutos:</strong>
                  <p className="font-mono text-[11px] bg-muted/20 p-2 rounded border border-border/30 mt-1 line-clamp-3">
                    {rawFandomData?.powersRaw || "Sem infobox detalhado de poderes"}
                  </p>
                </div>
              </div>
            </div>

            {/* Lado Direito: Formulário de Revisão e Ajuste de Rascunho */}
            <div className="border border-primary/40 bg-primary/5 p-4 rounded-lg space-y-5">
              <h4 className="font-heading text-xs font-bold tracking-widest text-primary uppercase flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> REVISÃO DO BANCO DE CONHECIMENTO
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground">NOME CANÔNICO *</label>
                  <Input
                    value={draft.canonical_name}
                    onChange={(e) => setDraft({ ...draft, canonical_name: e.target.value })}
                    className="font-body text-xs bg-muted/30 border-border/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground">FRANQUIA PAI *</label>
                  <Select value={selectedFranchiseId} onValueChange={setSelectedFranchiseId}>
                    <SelectTrigger className="bg-muted/30 border-border/50 text-xs font-body">
                      <SelectValue placeholder="Selecione a Franquia" />
                    </SelectTrigger>
                    <SelectContent>
                      {franchises.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name} ({f.slug})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Arquétipos de Gameplay */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-heading tracking-widest text-primary">ARQUÉTIPOS DE GAMEPLAY (SELECIONADOSpela IA)</label>
                <div className="flex flex-wrap gap-1.5">
                  {archetypes.map(arch => {
                    const selected = (draft.archetype_ids || []).includes(arch.id);
                    return (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => toggleArchetype(arch.id)}
                        className={`text-[10px] font-heading px-2 py-0.5 rounded border transition-colors ${
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground border-border/40 hover:border-border"
                        }`}
                      >
                        {arch.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Traços de Personalidade */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-heading tracking-widest text-primary">PERSONALIDADES NARRATIVAS</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-border/30 bg-muted/10 rounded">
                  {personalities.map(pers => {
                    const selected = (draft.personality_ids || []).includes(pers.id);
                    return (
                      <button
                        key={pers.id}
                        type="button"
                        onClick={() => togglePersonality(pers.id)}
                        className={`text-[10px] font-heading px-2 py-0.5 rounded border transition-colors ${
                          selected ? "bg-amber-500 text-black font-bold border-amber-400" : "bg-muted/20 text-muted-foreground border-border/40 hover:border-border"
                        }`}
                      >
                        {pers.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bio & Detalhes RPG */}
              <div className="space-y-2">
                <label className="text-[10px] font-heading tracking-widest text-muted-foreground">BIOGRAFIA RESUMIDA</label>
                <Textarea
                  value={draft.bio}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                  className="font-body text-xs bg-muted/30 border-border/50 h-20 resize-none"
                />
              </div>

              {/* Raridade & Função na Carta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground">RARIDADE DA CARTA</label>
                  <Select value={cardRarity} onValueChange={setCardRarity}>
                    <SelectTrigger className="bg-muted/30 border-border/50 text-xs font-body"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["C","UC","R","SR","SSR","UR","LR","MR","BOSS"].map(r => (
                        <SelectItem key={r} value={r}>[{r}]</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground">FUNÇÃO / ROLE</label>
                  <Select value={cardRole} onValueChange={setCardRole}>
                    <SelectTrigger className="bg-muted/30 border-border/50 text-xs font-body"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["DPS","Tank","Support","Healer","Assassin","Mage","Berserker","Sniper"].map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApproveAndSave}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-heading text-xs font-bold tracking-widest transition-colors rounded shadow flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> APROVAR E SALVAR NO BANCO DE CONHECIMENTO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
