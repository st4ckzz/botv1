/**
 * Módulo Encantador - Para gerenciar encantamentos automáticos de itens
 * Baseado na função 5 de encantamento
 */

// Lista de encantamentos máximos por tipo de item
const ENCANTAMENTOS = {
  '_sword': ['sharpness', 'fire_aspect', 'looting', 'unbreaking', 'mending', 'sweeping_edge'],
  '_pickaxe': ['efficiency', 'fortune', 'unbreaking', 'mending', 'silktouch'],
  '_axe': ['sharpness', 'efficiency', 'unbreaking', 'mending'],
  '_hoe': ['fortune', 'unbreaking', 'mending'], // ENXADA TAMBÉM, PORQUE NÃO?
  'bow': ['power', 'flame', 'infinity', 'punch'],
  'helmet': ['protection', 'unbreaking', 'mending', 'aqua_affinity', 'respiration'],
  'chestplate': ['protection', 'unbreaking', 'mending'],
  'leggings': ['protection', 'unbreaking', 'mending'],
  'boots': ['protection', 'unbreaking', 'mending', 'feather_falling', 'depth_strider']
};

module.exports = function(bot) {
  // Estado
  let encantamentoAtivo = false;
  let intervaloEncantamento = null;
  
  /**
   * Equipa um item na mão do bot
   * @param {Object} item - Item a ser equipado
   * @returns {Promise<boolean>} - Se conseguiu equipar
   */
  async function segurarItem(item) {
    try {
      await bot.equip(item, 'hand');
      console.log(`Item equipado: ${item.name}`);
      return true;
    } catch (err) {
      console.log(`Falha ao equipar ${item.name}: ${err.message}`);
      return false;
    }
  }
  
  /**
   * Tenta encantar todos os itens no inventário
   * @returns {Promise<number>} - Número de itens encantados
   */
  async function encantarInventario() {
    let itensEncantados = 0;
    
    for (const item of bot.inventory.items()) {
      // Verificar se o item corresponde a algum tipo de encantamento
      const tipo = Object.keys(ENCANTAMENTOS).find(key => item.name.includes(key));
      
      if (tipo && ENCANTAMENTOS[tipo]) {
        const equipou = await segurarItem(item);
        if (!equipou) continue;
        
        // Aplicar encantamentos um por um
        for (const encant of ENCANTAMENTOS[tipo]) {
          bot.chat(`/enchant @s ${encant} 32767`);
          console.log(`Aplicando ${encant} em ${item.name}`);
          itensEncantados++;
          await new Promise(resolve => setTimeout(resolve, 500)); // Evitar flood
        }
      }
    }
    
    if (itensEncantados > 0) {
      bot.chat("ENCANTAMENTOS CONCLUÍDOS. SEUS ITENS SÃO DEUSES AGORA.");
    }
    
    return itensEncantados;
  }
  
  /**
   * Ativa o modo de encantamento automático
   * @param {number} intervalo - Intervalo em minutos (padrão: 5)
   * @returns {boolean} - Se foi ativado com sucesso
   */
  function ativarEncantamentoAutomatico(intervalo = 5) {
    if (encantamentoAtivo) return false;
    
    try {
      // Converter intervalo para milissegundos
      const ms = intervalo * 60 * 1000;
      
      // Encantar imediatamente
      encantarInventario();
      
      // Configurar intervalo
      intervaloEncantamento = setInterval(encantarInventario, ms);
      encantamentoAtivo = true;
      
      return true;
    } catch (err) {
      console.error('Erro ao ativar encantamento automático:', err);
      return false;
    }
  }
  
  /**
   * Desativa o modo de encantamento automático
   */
  function pararEncantamentoAutomatico() {
    if (intervaloEncantamento) {
      clearInterval(intervaloEncantamento);
      intervaloEncantamento = null;
    }
    encantamentoAtivo = false;
  }
  
  /**
   * Verifica se o encantamento automático está ativo
   * @returns {boolean}
   */
  function estaAtivo() {
    return encantamentoAtivo;
  }
  
  return {
    encantarInventario,
    ativarEncantamentoAutomatico,
    pararEncantamentoAutomatico,
    estaAtivo
  };
};