import React, { useState } from 'react';
import { Terminal, Lock, Unlock, PlusCircle, X } from 'lucide-react';
import { useToast } from './use-toast';
import { db } from './base44Client';

export default function AdminTerminal({ onAddCard }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const { toast } = useToast();
  
  // Estado para a nova carta
  const [newCard, setNewCard] = useState({
    name: '', title: '', verse: 'Multiverse', rarity: 'Lendário', hp: 500, atk: 120, def: 100, imgUrl: ''
  });

  const ADMIN_PASSWORD = "OS_OVERRIDE_99"; // Chave de acesso mestra

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      if (toast) {
        toast({
          title: "⚡ ADMIN OVERRIDE ACCEPTED",
          description: "Terminal de Forja Cósmica desbloqueado com sucesso.",
        });
      }
    } else {
      alert("ACESSO NEGADO: ANOMALIA DETECTADA.");
    }
  };

  const handleForge = async (e) => {
    e.preventDefault();
    
    // Save locally
    const createdCard = await db.entities.Card.create({
      name: newCard.name,
      card_id: `CUSTOM-${Date.now()}`,
      series: newCard.verse || 'Multiverse',
      rarity: newCard.rarity === 'Lendário' ? 'UR' : newCard.rarity === 'Épico' ? 'SSR' : 'SR',
      role: 'DPS',
      gender: 'Unknown',
      element: 'Void',
      hp: Number(newCard.hp) || 500,
      attack: Number(newCard.atk) || 120,
      defense: Number(newCard.def) || 100,
      image_url: newCard.imgUrl || 'https://images.unsplash.com/photo-1605629713998-167cdc70fa2f?w=600&auto=format&fit=crop&q=80',
      lore: newCard.title || 'Anomalia forjada manualmente pelo Administrador.',
      created_date: new Date().toISOString()
    });

    // Also call onAddCard callback if provided
    if (onAddCard) {
      onAddCard(newCard);
    }

    if (toast) {
      toast({
        title: "🔮 ANOMALIA FORJADA!",
        description: `Carta ${newCard.name} injetada no Multiverso com sucesso.`,
      });
    } else {
      alert(`Carta ${newCard.name} forjada no Multiverso com sucesso!`);
    }

    setNewCard({ name: '', title: '', verse: 'Multiverse', rarity: 'Lendário', hp: 500, atk: 120, def: 100, imgUrl: '' });
  };

  return (
    <div className="fixed bottom-20 right-4 z-[999]">
      {/* Botão de abrir o terminal (discreto) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="p-3 bg-black/90 border border-[#00F0FF] rounded-full shadow-[0_0_15px_#00F0FF] hover:bg-cyan-950 transition-all group flex items-center justify-center cursor-pointer"
          title="Terminal de Forja Admin"
        >
          <Terminal className="text-[#00F0FF] group-hover:scale-110 transition-transform" size={22} />
        </button>
      )}

      {/* Painel do Terminal */}
      {isOpen && (
        <div className="bg-[#030305] border-2 border-[#00F0FF] p-5 rounded-xl shadow-[0_0_30px_rgba(0,240,255,0.4)] w-80 sm:w-96 text-[#00F0FF] font-mono relative backdrop-blur-md">
          <button 
            onClick={() => setIsOpen(false)} 
            className="absolute top-3 right-3 text-red-500 hover:text-red-400 p-1 cursor-pointer font-bold"
          >
            <X size={18} />
          </button>
          
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-cyan-400 border-b border-cyan-900 pb-2">
            <Terminal size={20} className="text-[#00F0FF] animate-pulse" /> FORJA CÓSMICA [ADMIN]
          </h2>

          {!isAuthenticated ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <p className="text-xs text-gray-400">Insira a chave de override tático para autorizar a injeção de novas cartas.</p>
              <div className="flex items-center gap-2 bg-gray-900/90 p-2.5 rounded-lg border border-cyan-800/80">
                <Lock size={16} className="text-cyan-400" />
                <input 
                  type="password" 
                  placeholder="Insira a Chave de Acesso..." 
                  className="bg-transparent outline-none w-full text-white text-xs placeholder-gray-500 font-mono"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                className="bg-[#00F0FF] text-black font-bold py-2.5 rounded-lg hover:bg-cyan-300 transition-colors text-xs tracking-wider cursor-pointer shadow-[0_0_10px_#00F0FF]"
              >
                DESBLOQUEAR SISTEMA
              </button>
              <p className="text-[10px] text-gray-500 text-center">Dica: OS_OVERRIDE_99</p>
            </form>
          ) : (
            <form onSubmit={handleForge} className="flex flex-col gap-2 text-xs text-gray-300 max-h-[75vh] overflow-y-auto pr-1">
              <div className="flex items-center gap-2 mb-1 text-green-400 font-semibold text-xs border-b border-green-900/50 pb-1">
                <Unlock size={14} /> ACESSO CONCEDIDO (MODO DEUS)
              </div>
              
              <div>
                <label className="text-[11px] text-cyan-300">Nome do Personagem</label>
                <input 
                  className="bg-black/80 border border-cyan-900 p-2 rounded text-white w-full text-xs focus:border-[#00F0FF] outline-none" 
                  required 
                  placeholder="Ex: Vegito Blue"
                  value={newCard.name} 
                  onChange={e => setNewCard({...newCard, name: e.target.value})} 
                />
              </div>
              
              <div>
                <label className="text-[11px] text-cyan-300">Título / Lore</label>
                <input 
                  className="bg-black/80 border border-cyan-900 p-2 rounded text-white w-full text-xs focus:border-[#00F0FF] outline-none" 
                  required 
                  placeholder="Ex: O Guerreiro Supremo da Fusão Divina"
                  value={newCard.title} 
                  onChange={e => setNewCard({...newCard, title: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-cyan-300">Raridade</label>
                  <select 
                    className="bg-black/80 border border-cyan-900 p-2 rounded text-white w-full text-xs focus:border-[#00F0FF] outline-none"
                    value={newCard.rarity}
                    onChange={e => setNewCard({...newCard, rarity: e.target.value})}
                  >
                    <option value="Lendário">Lendário (UR/MR)</option>
                    <option value="Épico">Épico (SSR)</option>
                    <option value="Raro">Raro (SR)</option>
                    <option value="Comum">Comum (R)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-cyan-300">Universo / Verse</label>
                  <input 
                    className="bg-black/80 border border-cyan-900 p-2 rounded text-white w-full text-xs focus:border-[#00F0FF] outline-none" 
                    value={newCard.verse} 
                    onChange={e => setNewCard({...newCard, verse: e.target.value})} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-cyan-300">HP</label>
                  <input 
                    type="number" 
                    className="bg-black/80 border border-cyan-900 p-1.5 rounded text-white w-full text-xs focus:border-[#00F0FF] outline-none" 
                    value={newCard.hp} 
                    onChange={e => setNewCard({...newCard, hp: Number(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-cyan-300">ATK</label>
                  <input 
                    type="number" 
                    className="bg-black/80 border border-cyan-900 p-1.5 rounded text-white w-full text-xs focus:border-[#00F0FF] outline-none" 
                    value={newCard.atk} 
                    onChange={e => setNewCard({...newCard, atk: Number(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-cyan-300">DEF</label>
                  <input 
                    type="number" 
                    className="bg-black/80 border border-cyan-900 p-1.5 rounded text-white w-full text-xs focus:border-[#00F0FF] outline-none" 
                    value={newCard.def} 
                    onChange={e => setNewCard({...newCard, def: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-cyan-300">URL da Imagem (WebP/PNG)</label>
                <input 
                  className="bg-black/80 border border-cyan-900 p-2 rounded text-white w-full text-xs focus:border-[#00F0FF] outline-none" 
                  placeholder="https://images.unsplash.com/..."
                  value={newCard.imgUrl} 
                  onChange={e => setNewCard({...newCard, imgUrl: e.target.value})} 
                />
              </div>

              <button 
                type="submit" 
                className="mt-3 bg-[#B400FF] text-white font-bold py-2.5 rounded-lg hover:bg-purple-600 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(180,0,255,0.6)] cursor-pointer text-xs"
              >
                <PlusCircle size={16} /> INJETAR ANOMALIA
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
