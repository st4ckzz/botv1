/**
 * Navegação - Módulo para movimentação inteligente do bot
 * Implementa pathfinding e navegação para coordenadas e mineração
 */

// Função para inicializar o módulo de navegação
function setupNavegacao(bot) {
  try {
    // Importar módulos necessários
    const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
    const { GoalNear, GoalBlock } = goals;
    
    // Verificar se o plugin pathfinder já está carregado
    if (!bot.pathfinder) {
      bot.loadPlugin(pathfinder);
    }
    
    // Variáveis de controle
    let tarefaAtiva = false;
    let destino = null;
    const movimentos = new Movements(bot);
    
    // Ajustar configurações de movimento com base na versão do servidor
    movimentos.canDig = true;
    movimentos.allowSprinting = true;
    
    // Função para navegar para coordenadas específicas
    function navegarPara(x, y, z, distancia = 1) {
      try {
        bot.pathfinder.setMovements(movimentos);
        const meta = new GoalNear(x, y, z, distancia);
        bot.pathfinder.setGoal(meta);
        destino = { x, y, z };
        tarefaAtiva = true;
        
        return true;
      } catch (error) {
        console.error('Erro ao navegar:', error);
        return false;
      }
    }
    
    // Função para encontrar e minerar blocos
    function minerarBloco(tipo, maxDistancia = 64) {
      try {
        // Se não for fornecido um nome de bloco específico, usar diamond_ore como padrão
        const blockType = tipo || 'diamond_ore';
        
        // Tentar encontrar o bloco mais próximo do tipo especificado
        const block = bot.findBlock({
          matching: (block) => {
            // Verificar se o nome do bloco contém a string especificada
            return block.name.includes(blockType.toLowerCase());
          },
          maxDistance: maxDistancia
        });
        
        if (block) {
          bot.pathfinder.setMovements(movimentos);
          bot.pathfinder.setGoal(new GoalBlock(block.position.x, block.position.y, block.position.z));
          destino = block.position;
          tarefaAtiva = true;
          
          // Quando o bot chegar perto do bloco, minerar
          const listener = () => {
            const blockAtPos = bot.blockAt(destino);
            if (blockAtPos && bot.canDigBlock(blockAtPos)) {
              bot.dig(blockAtPos, (err) => {
                if (err) {
                  bot.chat(`Erro ao minerar: ${err.message}`);
                } else {
                  bot.chat(`Minerei ${blockType} em X:${destino.x}, Y:${destino.y}, Z:${destino.z}`);
                }
                bot.removeListener('goal_reached', listener);
              });
            }
          };
          
          bot.on('goal_reached', listener);
          return true;
        } else {
          return false;
        }
      } catch (error) {
        console.error('Erro ao minerar:', error);
        return false;
      }
    }
    
    // Função para cancelar a navegação atual
    function pararNavegacao() {
      try {
        if (bot.pathfinder) {
          bot.pathfinder.stop();
          tarefaAtiva = false;
          destino = null;
        }
        
        return true;
      } catch (error) {
        console.error('Erro ao parar navegação:', error);
        return false;
      }
    }
    
    // Processar comandos de chat para navegação
    bot.on('chat', (username, message) => {
      // Não processar mensagens do próprio bot
      if (username === bot.username) return;
      
      // Verificar se a mensagem é um comando com prefixo !
      if (message.startsWith('!')) {
        const comando = message.slice(1).trim().toLowerCase();
        const args = comando.split(' ');
        
        switch(args[0]) {
          case 'ir':
            if (args.length >= 4) {
              const x = parseInt(args[1]);
              const y = parseInt(args[2]);
              const z = parseInt(args[3]);
              
              if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                if (navegarPara(x, y, z)) {
                  bot.chat(`INDO PARA X:${x}, Y:${y}, Z:${z}... SENTA E ESPERA!`);
                } else {
                  bot.chat("DEU MERDA NA NAVEGAÇÃO! TENTA OUTRA VEZ.");
                }
              } else {
                bot.chat("ESSES NÚMEROS TÃO ZUADOS! USA TIPO: !ir 100 64 -100");
              }
            } else {
              bot.chat("FALTAM COORDENADAS, IMBECIL! USA: !ir X Y Z");
            }
            break;
            
          case 'minerar':
            if (args.length >= 2) {
              const tipoBloco = args[1];
              if (minerarBloco(tipoBloco)) {
                bot.chat(`PROCURANDO ${tipoBloco.toUpperCase()} PRA MINERAR... CALMA AÍ!`);
              } else {
                bot.chat(`NÃO ACHEI NENHUM ${tipoBloco.toUpperCase()} POR AQUI, SEU OTÁRIO!`);
              }
            } else {
              bot.chat("QUE BLOCO VOCÊ QUER QUE EU MINERE, ANIMAL? USA: !minerar diamante");
            }
            break;
            
          case 'parar':
            if (pararNavegacao()) {
              bot.chat("PAREI TUDO! SATISFEITO AGORA?");
            } else {
              bot.chat("NÃO ESTOU FAZENDO NADA PRA PARAR, SEU BURRO!");
            }
            break;
        }
      }
    });
    
    // Registrar eventos para rastrear o estado da navegação
    bot.on('goal_reached', () => {
      if (destino) {
        bot.chat(`CHEGUEI NAS COORDENADAS X:${destino.x}, Y:${destino.y}, Z:${destino.z}`);
        tarefaAtiva = false;
      }
    });
    
    bot.on('path_update', (results) => {
      if (results.status === 'noPath') {
        bot.chat("NÃO CONSIGO CHEGAR LÁ! O CAMINHO TÁ BLOQUEADO, IMBECIL!");
        tarefaAtiva = false;
      }
    });
    
    // Expor as funções para uso externo
    bot.navegacao = {
      irPara: navegarPara,
      minerar: minerarBloco,
      parar: pararNavegacao,
      estaAtivo: () => tarefaAtiva,
      destino: () => destino
    };
    
    console.log('Módulo de navegação inicializado');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar módulo de navegação:', error);
    return false;
  }
}

module.exports = { setupNavegacao };