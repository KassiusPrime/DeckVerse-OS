// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Core AI Multi-Model Router
// Routes AI tasks to dedicated models with fallback & canonical 'propose' policy
// ════════════════════════════════════════════════════════════════════════════

import { GoogleGenAI } from "@google/genai";

class AIRouter {
  constructor() {
    this.geminiKey = typeof process !== "undefined" && process.env ? (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) : "";
    this.openRouterKey = typeof process !== "undefined" && process.env ? process.env.VITE_OPENROUTER_API_KEY : "";
  }

  getGeminiClient() {
    const key = this.geminiKey || (typeof window !== "undefined" && window.localStorage ? localStorage.getItem("gemini_api_key") : "");
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
  }

  /**
   * Route task to preferred model or fallback
   */
  async executeTask(taskType, prompt, systemInstruction = "") {
    const ai = this.getGeminiClient();

    // Task mapping
    // classify / batch -> Gemma / OpenRouter or Gemini Flash
    // extract -> Qwen / Gemini Flash
    // lore / translate -> Gemini Flash
    // describe -> Mistral / Gemini Flash
    // code -> DeepSeek / Gemini Flash

    if (!ai) {
      console.warn(`[AIRouter] Chave Gemini não configurada. Ativando modo fallback offline para tarefa: ${taskType}`);
      return this.generateOfflineFallback(taskType, prompt);
    }

    try {
      const modelName = "gemini-2.5-flash";
      const res = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      if (res && res.text) {
        return JSON.parse(res.text);
      }
    } catch (err) {
      console.warn(`[AIRouter] Erro na requisição via Gemini (${err?.message || err}). Retornando resposta padrão offline.`);
      return this.generateOfflineFallback(taskType, prompt);
    }

    return this.generateOfflineFallback(taskType, prompt);
  }

  /**
   * Propose canonical card corrections (Policy: PROPOSE - no direct overwrite without approval)
   */
  async proposeCardCorrection(card) {
    const prompt = `Analise os dados desta carta e proponha correções canônicas de texto e estatísticas sem aplicar diretamente:
Carta: ${JSON.stringify(card)}
Responda em JSON:
{
  "card_id": "${card.card_id || card.id}",
  "proposed_changes": {
    "canonical_name": "Nome Canônico Corrigido",
    "lore": "Lore enriquecida",
    "suggested_role": "DPS",
    "suggested_element": "Elemento"
  },
  "confidence_score": 0.95,
  "reasoning": "Motivação da proposta de correção"
}`;

    const result = await this.executeTask("extract", prompt, "Você é um assistente de validação canônica TCG com política 'propose'.");
    return {
      policy: "propose",
      card_id: card.card_id || card.id,
      card_name: card.name,
      proposal: result
    };
  }

  /**
   * Generate offline deterministic fallback when AI keys/quota are unavailable
   */
  generateOfflineFallback(taskType, prompt) {
    switch (taskType) {
      case "extract":
        return { status: "needs_enrichment", canonicalData: null };
      case "classify":
      case "batch":
        return { status: "needs_enrichment", archetypes: [], tags: [] };
      case "lore":
      case "translate":
        return { status: "needs_enrichment", translated_lore: null };
      case "describe":
        return { status: "needs_enrichment", description: null };
      case "code":
        return { status: "needs_enrichment", code_snippet: null };
      default:
        return { status: "needs_enrichment", result: null };
    }
  }
}

export const aiRouter = new AIRouter();
