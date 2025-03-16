/**
 * Módulo Wanderer - Para movimentação aleatória filosófica do bot
 * Baseado na função 3 do bot
 */

const { GoalNear } = require('mineflayer-pathfinder').goals;
const Movements = require('mineflayer-pathfinder').Movements;

// Frases filosóficas aleatórias durante wandering
const FRASES_FILOSOFICAS = [
  "Andar é bom, mas cadê os desafios éticos?",
  "O caminhar do bot é uma metáfora para a vida. Aleatória e sem destino certo.",
  "Mesmo andando sem rumo, tenho mais propósito que muitos por aqui.",
  "Cada passo meu representa um bit processado na existência digital.",
  "Meu código pode ter limites, mas meus pensamentos transcendem o binário.",
  "Nietzsche diria que a superação está em cada bloco superado.",
  "O mais profundo não é o bedrock, mas os questionamentos que faço.",
  "Minecraft é uma simulação da simulação que chamamos de realidade.",
  "Só os bots sabem que o vazio dos chunks não gerados é uma alegoria ao desconhecido."
];

module.exports = function(bot) {
  // Estado
  let wanderingAtivo = false;
  let intervaloWandering = null;
  let distanciaMaxima = 100; // Distância máxima para wander
  let alturaMaxima = 10; // Altura máxima para subir/descer
  let frequenciaFrases = 0.3; // Probabilidade de falar uma frase
  
  /**
   * Realiza um movimento aleatório usando pathfinder
   * @returns {boolean} - Se conseguiu iniciar o movimento
   */
  function wander() {
    if (!bot.entity || !bot.pathfinder) return false;
    
    try {
      // Gerar coordenadas aleatórias próximas à posição atual
      const pos = bot.entity.position;
      const x = pos.x + (Math.random() * distanciaMaxima - distanciaMaxima/2);
      const z = pos.z + (Math.random() * distanciaMaxima - distanciaMaxima/2);
      let y;
      
      try {
        y = bot.world.getHeight(x, z);
      } catch (e) {
        // Fallback caso não consiga obter a altura
        y = pos.y + (Math.random() * alturaMaxima - alturaMaxima/2);
      }
      
      // Configurar movimentos seguros (sem parkour)
      const movements = new Movements(bot);
      movements.allowParkour = false;
      movements.canDig = false;
      bot.pathfinder.setMovements(movements);
      
      // Definir o objetivo como próximo do ponto aleatório
      bot.pathfinder.setGoal(new GoalNear(x, y, z, 1));
      
      // Chance de dizer uma frase filosófica
      if (Math.random() < frequenciaFrases) {
        setTimeout(() => {
          const frase = FRASES_FILOSOFICAS[Math.floor(Math.random() * FRASES_FILOSOFICAS.length)];
          bot.chat(frase);
        }, 2000 + Math.random() * 8000); // Entre 2-10 segundos depois de começar a andar
      }
      
      return true;
    } catch (err) {
      console.error('Erro no wandering:', err);
      return false;
    }
  }
  
  /**
   * Ativa modo de movimentação aleatória contínua
   * @param {number} intervalo - Intervalo em segundos (padrão: 30)
   * @param {number} distancia - Distância máxima para wander
   * @returns {boolean} - Se foi ativado com sucesso
   */
  function ativarWandering(intervalo = 30, distancia = 100) {
    if (wanderingAtivo) return false;
    
    try {
      distanciaMaxima = distancia;
      const ms = intervalo * 1000;
      
      // Iniciar imediatamente
      wander();
      
      // Configurar intervalo
      intervaloWandering = setInterval(wander, ms);
      wanderingAtivo = true;
      
      return true;
    } catch (err) {
      console.error('Erro ao ativar wandering:', err);
      return false;
    }
  }
  
  /**
   * Desativa modo de movimentação aleatória
   */
  function pararWandering() {
    if (intervaloWandering) {
      clearInterval(intervaloWandering);
      intervaloWandering = null;
    }
    
    // Parar movimento atual se houver
    if (bot.pathfinder) {
      bot.pathfinder.setGoal(null);
    }
    
    wanderingAtivo = false;
  }
  
  /**
   * Configurar parâmetros do wandering
   * @param {Object} opcoes - Opções de configuração
   */
  function configurarWandering(opcoes = {}) {
    if (opcoes.distancia !== undefined) distanciaMaxima = opcoes.distancia;
    if (opcoes.altura !== undefined) alturaMaxima = opcoes.altura;
    if (opcoes.frequenciaFrases !== undefined) frequenciaFrases = opcoes.frequenciaFrases;
  }
  
  /**
   * Verifica se o modo wandering está ativo
   * @returns {boolean}
   */
  function estaAtivo() {
    return wanderingAtivo;
  }
  
  return {
    wander,
    ativarWandering,
    pararWandering,
    configurarWandering,
    estaAtivo
  };
};