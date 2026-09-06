const tradeIdOption = { type: 3, name: 'id', description: 'ID da troca', required: true };

export const DISCORD_COMMANDS = [
  {
    name: 'r', description: 'Rola cartas', options: [
      { type: 4, name: 'q', description: 'Quantidade dentro do seu limite atual', required: false, min_value: 1, max_value: 100 },
      { type: 3, name: 'm', description: 'Moeda', required: false, choices: [
        { name: 'Astral', value: 'astral' },
        { name: 'Éter', value: 'ether' },
        { name: 'Roll gratuito', value: 'gratis' },
      ] },
    ],
  },
  { name: 'c', description: 'Pega uma carta do spawn', options: [{ type: 4, name: 'n', description: 'Número da carta', required: false, min_value: 1, max_value: 100 }] },
  { name: 'i', description: 'Mostra seu acervo e os IDs das cartas' },
  { name: 'p', description: 'Mostra perfil, moedas, sorte e limite de giros' },
  {
    name: 'prog', description: 'Vê ou redistribui seus pontos de nível', options: [
      { type: 4, name: 'limite', description: 'Pontos destinados ao limite (+1 por ponto)', required: false, min_value: 0, max_value: 1000 },
      { type: 4, name: 'sorte', description: 'Pontos destinados à Sorte Cósmica', required: false, min_value: 0, max_value: 1000 },
    ],
  },
  { name: 'unlock', description: 'Compra um Expansor de Giros permanente de +10' },
  {
    name: 'v', description: 'Vende carta ao sistema por Deck Credits', options: [
      { type: 3, name: 'card', description: 'ID da carta (veja em /i)', required: true },
      { type: 4, name: 'q', description: 'Quantidade', required: false, min_value: 1, max_value: 999 },
    ],
  },
  {
    name: 't', description: 'Trocas P2P seguras entre jogadores', options: [
      { type: 1, name: 'list', description: 'Lista suas trocas recentes' },
      { type: 1, name: 'new', description: 'Abre uma troca com outro jogador', options: [{ type: 6, name: 'user', description: 'Jogador do Discord', required: true }] },
      { type: 1, name: 'offer', description: 'Define sua oferta na troca', options: [
        tradeIdOption,
        { type: 3, name: 'card', description: 'ID de uma carta; deixe vazio para só DC', required: false },
        { type: 4, name: 'q', description: 'Quantidade da carta', required: false, min_value: 1, max_value: 999 },
        { type: 4, name: 'dc', description: 'Deck Credits oferecidos', required: false, min_value: 0, max_value: 2000000000 },
      ] },
      { type: 1, name: 'confirm', description: 'Confirma que sua oferta está correta', options: [tradeIdOption] },
      { type: 1, name: 'accept', description: 'Aceita definitivamente uma troca pronta', options: [tradeIdOption] },
      { type: 1, name: 'cancel', description: 'Cancela uma troca', options: [tradeIdOption] },
      { type: 1, name: 'reject', description: 'Recusa uma troca recebida', options: [tradeIdOption] },
    ],
  },
  { name: 'h', description: 'Ajuda rápida' },
  {
    name: 's', description: 'Configura o spawn automático', options: [
      { type: 1, name: 'ch', description: 'Define o canal do spawn', options: [{ type: 7, name: 'c', description: 'Canal', required: true }] },
      { type: 1, name: 'on', description: 'Liga o spawn automático' },
      { type: 1, name: 'off', description: 'Desliga o spawn automático' },
      { type: 1, name: 't', description: 'Define o intervalo', options: [{ type: 4, name: 'm', description: 'Minutos', required: true, min_value: 5, max_value: 1440 }] },
      { type: 1, name: 'max', description: 'Máximo por rodada', options: [{ type: 4, name: 'n', description: 'Máximo', required: true, min_value: 1, max_value: 100 }] },
      { type: 1, name: 'now', description: 'Agenda spawn para o próximo ciclo' },
    ],
  },
];

export default DISCORD_COMMANDS;
