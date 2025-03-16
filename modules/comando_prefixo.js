/**
 * Módulo de Comandos com Prefixo - Para processamento de comandos via chat
 * Baseado na função 2 do bot
 */

const { GoalNear, GoalBlock } = require('mineflayer-pathfinder').goals;
const Movements = require('mineflayer-pathfinder').Movements;

module.exports = function(bot) {
  // Estado
  let prefixo = '!';
  let tarefaAtiva = false;
  let cooldown = 2000; // 2 segundos
  let ultimoComando = 0;
  let comandosRegistrados = {};
  let listenerAtivo = false;
  
  /**
   * Registra comandos básicos do sistema
   */
  function registrarComandosBasicos() {
    comandosRegistrados = {
      'ir': (x, y, z) => {
        if (!x || !y || !z) return false;
        
        x = parseInt(x);
        y = parseInt(y);
        z = parseInt(z);
        
        if (isNaN(x) || isNaN(y) || isNaN(z)) return false;
        
        bot.chat(`INDO PARA X:${x}, Y:${y}, Z:${z}`);
        const movements = new Movements(bot);
        bot.pathfinder.setMovements(movements);
        bot.pathfinder.setGoal(new GoalNear(x, y, z, 1));
        tarefaAtiva = true;
        return true;
      },
      
      'minerar': (bloco) => {
        if (!bloco) return false;
        
        const alvo = bot.findBlock({
          matching: bloco,
          maxDistance: 64
        });
        
        if (alvo) {
          bot.chat(`MINERANDO ${bloco.toUpperCase()}...`);
          bot.pathfinder.setGoal(new GoalBlock(alvo.position.x, alvo.position.y, alvo.position.z));
          tarefaAtiva = true;
          return true;
        } else {
          bot.chat(`NÃO ACHEI ${bloco.toUpperCase()} AQUI!`);
          return false;
        }
      },
      
      'parar': () => {
        bot.pathfinder.stop();
        bot.chat("PAREI TUDO, CHEFE!");
        tarefaAtiva = false;
        return true;
      },
      
      'status': () => {
        const pos = bot.entity.position;
        bot.chat(`POSIÇÃO: X${Math.round(pos.x)} Y${Math.round(pos.y)} Z${Math.round(pos.z)} | TAREFA: ${tarefaAtiva ? 'ATIVA' : 'OCIOSO'}`);
        return true;
      },
      
      'ajuda': () => {
        const comandos = Object.keys(comandosRegistrados).join(', ');
        bot.chat(`COMANDOS DISPONÍVEIS: ${prefixo}${comandos}`);
        return true;
      },
      
      'matar': (mob) => {
        if (!mob) return false;
        
        const alvo = bot.nearestEntity(e => e.name === mob);
        if (alvo) {
          bot.chat(`CAÇANDO ${mob.toUpperCase()}...`);
          bot.pathfinder.setGoal(new GoalNear(alvo.position.x, alvo.position.y, alvo.position.z, 1));
          tarefaAtiva = true;
          return true;
        } else {
          bot.chat(`${mob.toUpperCase()}? NEM VI ESSA PORRA!`);
          return false;
        }
      },
      
      'construir': (bloco, qtd) => {
        if (!bloco) return false;
        
        qtd = parseInt(qtd) || 1;
        
        if (!bot.inventory.items().find(i => i.name === bloco)) {
          bot.chat(`NÃO TENHO ${bloco.toUpperCase()} NO INVENTÁRIO!`);
          return false;
        }
        
        bot.chat(`CONSTRUINDO ${qtd} BLOCOS DE ${bloco.toUpperCase()}...`);
        // Aqui iria a lógica para construção (implementação completa requer mecânicas complexas)
        return true;
      }
    };
  }
  
  /**
   * Processa uma mensagem de comando
   * @param {string} username - Nome do usuário que enviou
   * @param {string} message - Mensagem enviada
   * @returns {boolean} - Se o comando foi processado
   */
  function processarComando(username, message) {
    // Ignorar mensagens próprias ou que não começam com o prefixo
    if (username === bot.username || !message.startsWith(prefixo)) {
      return false;
    }
    
    // Verificar cooldown
    if (Date.now() - ultimoComando < cooldown) {
      return false;
    }
    
    ultimoComando = Date.now();
    
    // Extrair comando e argumentos
    const args = message.slice(prefixo.length).split(' ');
    const comando = args.shift().toLowerCase();
    
    // Executar o comando se existir
    if (comandosRegistrados[comando]) {
      const resultado = comandosRegistrados[comando](...args);
      return resultado;
    } else {
      bot.chat(`COMANDO ${comando.toUpperCase()} NÃO EXISTE! DIGITE ${prefixo}ajuda`);
      return false;
    }
  }
  
  /**
   * Ativa o listener de comandos
   */
  function ativar() {
    if (listenerAtivo) return;
    
    // Registrar comandos básicos
    registrarComandosBasicos();
    
    // Configurar listener de chat
    bot.on('chat', processarComando);
    
    listenerAtivo = true;
  }
  
  /**
   * Desativa o listener de comandos
   */
  function desativar() {
    if (!listenerAtivo) return;
    
    bot.removeListener('chat', processarComando);
    listenerAtivo = false;
  }
  
  /**
   * Adiciona um novo comando personalizado
   * @param {string} nome - Nome do comando
   * @param {function} callback - Função a ser executada
   * @returns {boolean} - Se conseguiu adicionar
   */
  function adicionarComando(nome, callback) {
    if (!nome || typeof callback !== 'function') return false;
    
    comandosRegistrados[nome] = callback;
    return true;
  }
  
  /**
   * Remove um comando existente
   * @param {string} nome - Nome do comando a remover
   * @returns {boolean} - Se conseguiu remover
   */
  function removerComando(nome) {
    if (!comandosRegistrados[nome]) return false;
    
    delete comandosRegistrados[nome];
    return true;
  }
  
  /**
   * Altera o prefixo dos comandos
   * @param {string} novoPrefixo - Novo prefixo a ser usado
   */
  function alterarPrefixo(novoPrefixo) {
    if (!novoPrefixo || novoPrefixo.length === 0) return false;
    
    prefixo = novoPrefixo;
    return true;
  }
  
  /**
   * Altera o cooldown entre comandos
   * @param {number} ms - Tempo em milissegundos
   */
  function alterarCooldown(ms) {
    if (!ms || ms < 0) return false;
    
    cooldown = ms;
    return true;
  }
  
  /**
   * Lista todos os comandos disponíveis
   * @returns {string[]} - Lista de comandos
   */
  function listarComandos() {
    return Object.keys(comandosRegistrados);
  }
  
  /**
   * Verifica se uma tarefa está ativa
   * @returns {boolean}
   */
  function temTarefaAtiva() {
    return tarefaAtiva;
  }
  
  // Inicializar automaticamente quando o bot spawnar
  bot.once('spawn', () => {
    ativar();
    bot.chat(`SISTEMA DE COMANDOS ATIVO! DIGITE ${prefixo}ajuda PARA VER COMANDOS.`);
  });
  
  return {
    ativar,
    desativar,
    adicionarComando,
    removerComando,
    alterarPrefixo,
    alterarCooldown,
    listarComandos,
    temTarefaAtiva,
    processarComando
  };
};