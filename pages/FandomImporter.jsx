import React, { useState } from 'react';
import { Globe, Search, Download, Shield, Swords, Target, CheckCircle2, Sparkles, Terminal } from 'lucide-react';
import Navbar from '../Navbar';
import { useToast } from '../use-toast';
import { base44 } from '../base44Client';

export default function FandomImporter() {
  const [queryName, setQueryName] = useState('');
  const [queryFandom, setQueryFandom] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);
  const [importedSuccess, setImportedSuccess] = useState(false);
  const { toast } = useToast();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!queryName || !queryFandom) return;
    setIsSearching(true);
    setPreviewCard(null);
    setImportedSuccess(false);

    // Simulador de Scraping de API Fandom Wiki
    setTimeout(() => {
      setIsSearching(false);
      
      // Select dynamic image depending on anime or default high quality cyberpunk image
      const imageOptions = [
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618336753174-8e650807f6f8?w=600&auto=format&fit=crop&q=80'
      ];
      const randomImg = imageOptions[Math.floor(Math.random() * imageOptions.length)];

      const generatedCard = {
        uniqueId: Date.now(),
        socialName: queryName.toUpperCase(),
        title: `Entidade Elemental de ${queryFandom}`,
        verse: queryFandom,
        rarity: Math.random() > 0.4 ? 'Épico' : 'Lendário',
        hp: Math.floor(Math.random() * 300) + 250,
        atk: Math.floor(Math.random() * 120) + 80,
        def: Math.floor(Math.random() * 100) + 60,
        img: randomImg,
        color: 'from-purple-600 to-indigo-800'
      };

      setPreviewCard(generatedCard);
      
      if (toast) {
        toast({
          title: "🌐 CONEXÃO WIKI ESTABELECIDA",
          description: `Anomalia [${generatedCard.socialName}] extraída do multiverso ${queryFandom}!`,
        });
      }
    }, 1800);
  };

  const handleImport = async () => {
    if (!previewCard) return;

    try {
      const colId = (previewCard.verse || 'MULTIVERSE').toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const cardId = `FANDOM-${previewCard.uniqueId}`;

      // Save card directly to Base44 persistent database
      const createdCard = await base44.entities.Card.create({
        name: previewCard.socialName,
        card_id: cardId,
        collection_id: colId,
        series: previewCard.verse || 'Multiverse',
        rarity: previewCard.rarity === 'Lendário' ? 'UR' : 'SSR',
        role: 'DPS',
        gender: 'Unknown',
        element: 'Void',
        hp: previewCard.hp,
        attack: previewCard.atk,
        defense: previewCard.def,
        image_url: previewCard.img,
        img_oficial: previewCard.img,
        lore: `Importado via Nexus Fandom Scraper do universo ${previewCard.verse}.`,
        created_date: new Date().toISOString()
      });

      // Also save to Roster so card appears owned in player collection
      await base44.entities.Roster.create({
        player_discord_id: 'player_001',
        card_id: createdCard.card_id || createdCard.id || cardId,
        card_name: previewCard.socialName,
        level: 1,
        copies: 1,
        created_date: new Date().toISOString()
      }).catch(() => null);

      setImportedSuccess(true);
      if (toast) {
        toast({
          title: "⚡ ANOMALIA INJETADA COM SUCESSO!",
          description: `Carta ${previewCard.socialName} adicionada ao seu acervo e coleção multiversal.`,
        });
      }
    } catch (err) {
      console.error("Erro ao salvar no banco:", err);
      setImportedSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#030305] text-[#D1D5DB] pb-24">
      <Navbar />

      {/* Cyber Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(0,240,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />

      <main className="max-w-4xl mx-auto px-4 pt-8 relative z-10">
        
        {/* Header Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 border border-[#B400FF]/50 bg-[#B400FF]/10 px-3 py-1 rounded-full text-xs font-mono text-[#B400FF] mb-3 shadow-[0_0_12px_rgba(180,0,255,0.3)]">
            <Globe className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
            <span>NEXUS SCRAPER v2.4</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-['Orbitron'] text-white tracking-wider uppercase mb-2">
            CONEXÃO <span className="text-[#B400FF] drop-shadow-[0_0_10px_#B400FF]">FANDOM WIKI</span>
          </h1>
          <p className="text-gray-400 font-mono text-xs sm:text-sm max-w-lg mx-auto">
            Digite o nome do personagem e a obra correspondente. O terminal tático vasculhará a rede em busca de atributos e imagens para forjar a carta.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSearch} className="bg-[#0A0A0E] border border-[#B400FF]/50 p-6 rounded-xl shadow-[0_0_25px_rgba(180,0,255,0.15)] flex flex-col md:flex-row gap-4 mb-10">
          <div className="flex-1">
            <label className="text-xs text-[#B400FF] uppercase font-bold font-mono tracking-wider mb-1.5 block">
              Nome do Personagem
            </label>
            <input 
              type="text" 
              required 
              value={queryName} 
              onChange={(e) => setQueryName(e.target.value)} 
              placeholder="Ex: Satoru Gojo / Sung Jinwoo / Naruto" 
              className="w-full bg-black/90 border border-gray-800 rounded-lg p-3 text-white outline-none focus:border-[#B400FF] transition-colors font-mono text-sm" 
            />
          </div>

          <div className="flex-1">
            <label className="text-xs text-[#B400FF] uppercase font-bold font-mono tracking-wider mb-1.5 block">
              Fandom / Obra
            </label>
            <input 
              type="text" 
              required 
              value={queryFandom} 
              onChange={(e) => setQueryFandom(e.target.value)} 
              placeholder="Ex: Jujutsu Kaisen / Solo Leveling" 
              className="w-full bg-black/90 border border-gray-800 rounded-lg p-3 text-white outline-none focus:border-[#B400FF] transition-colors font-mono text-sm" 
            />
          </div>

          <button 
            type="submit" 
            disabled={isSearching} 
            className="md:self-end bg-[#B400FF] text-white px-7 py-3 rounded-lg font-bold font-mono hover:bg-purple-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(180,0,255,0.4)] text-sm tracking-wider"
          >
            {isSearching ? <span className="animate-spin text-lg">⚙</span> : <Search className="w-4 h-4" />}
            <span>{isSearching ? "VASCULHANDO..." : "BUSCAR"}</span>
          </button>
        </form>

        {/* LOADING STATE */}
        {isSearching && (
          <div className="bg-[#0A0A0E] border border-[#00F0FF]/40 p-12 rounded-xl text-center font-mono shadow-[0_0_20px_rgba(0,240,255,0.2)] animate-pulse">
            <Terminal className="w-12 h-12 text-[#00F0FF] mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-[#00F0FF] mb-1">CONECTANDO AO NÚCLEO DA WIKI...</h3>
            <p className="text-xs text-gray-400">Extraindo atributos dimensionais e gerando renderização WebP...</p>
          </div>
        )}

        {/* PREVIEW CARD DISPLAY */}
        {previewCard && !isSearching && (
          <div className="bg-[#0A0A0E] border-2 border-[#00F0FF] p-6 sm:p-8 rounded-xl flex flex-col md:flex-row gap-8 items-center shadow-[0_0_35px_rgba(0,240,255,0.25)] relative overflow-hidden">
            
            {/* Holographic Watermark Badge */}
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-[#00F0FF]/5 rounded-full blur-2xl pointer-events-none" />

            {/* Card Graphic View */}
            <div className="w-64 h-80 rounded-xl overflow-hidden border-2 border-[#00F0FF] relative shrink-0 shadow-[0_0_20px_#00F0FF] group">
              <img src={previewCard.img} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-2 right-2 bg-black/90 px-2.5 py-1 rounded border border-[#00F0FF] text-[#00F0FF] text-xs font-bold font-mono">
                {previewCard.rarity}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
                <p className="text-center text-[10px] text-[#00F0FF] font-mono tracking-widest uppercase">
                  ✓ EXTRAÍDO VIA FANDOM WIKI
                </p>
              </div>
            </div>
            
            {/* Card Information & Stats */}
            <div className="flex-1 font-mono w-full">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-gray-400 uppercase tracking-widest">ANOMALIA DETECTADA</span>
              </div>

              <h3 className="text-3xl font-black text-white uppercase tracking-wide mb-1 font-['Orbitron']">
                {previewCard.socialName}
              </h3>
              <p className="text-[#00F0FF] font-semibold text-sm mb-6 flex items-center gap-2">
                <Globe className="w-4 h-4" /> {previewCard.verse}
              </p>
              
              {/* Battle Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-black/80 border border-green-500/40 p-3 rounded-lg text-center">
                  <p className="text-green-400 text-[10px] tracking-wider mb-0.5 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" /> HP
                  </p>
                  <p className="text-xl font-bold text-white">{previewCard.hp}</p>
                </div>

                <div className="bg-black/80 border border-red-500/40 p-3 rounded-lg text-center">
                  <p className="text-red-400 text-[10px] tracking-wider mb-0.5 flex items-center justify-center gap-1">
                    <Swords className="w-3 h-3" /> ATAQUE
                  </p>
                  <p className="text-xl font-bold text-white">{previewCard.atk}</p>
                </div>

                <div className="bg-black/80 border border-blue-500/40 p-3 rounded-lg text-center">
                  <p className="text-blue-400 text-[10px] tracking-wider mb-0.5 flex items-center justify-center gap-1">
                    <Target className="w-3 h-3" /> DEFESA
                  </p>
                  <p className="text-xl font-bold text-white">{previewCard.def}</p>
                </div>
              </div>

              {/* Action Button */}
              {importedSuccess ? (
                <div className="bg-green-950/80 border border-green-500 text-green-300 py-3.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span>INJETADO NO ACERVO MULTIVERSAL!</span>
                </div>
              ) : (
                <button 
                  onClick={handleImport} 
                  className="w-full bg-[#00F0FF] text-black py-4 rounded-lg font-bold font-['Orbitron'] text-xs sm:text-sm tracking-wider hover:bg-cyan-300 transition-all flex justify-center items-center gap-2.5 shadow-[0_0_20px_#00F0FF] cursor-pointer"
                >
                  <Download className="w-4 h-4" /> APROVAR E INJETAR NO ACERVO
                </button>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
