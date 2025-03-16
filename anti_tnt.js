/**
 * Anti-TNT - Módulo para prevenção de uso de TNT pelo bot
 * Identifica e evita TNT em inventário e reage a conversas sobre explosões
 */

module.exports = function(bot) {
  // Lista de itens perigosos para monitorar
  const perigosos = ['tnt', 'flint_and_steel', 'fire_charge', 'end_crystal'];
  
  // Monitorar itens coletados
  bot.on('playerCollect', (collector, collected) => {
    try {
      if (collector.username === bot.username) {
        const item = bot.inventory.items().find(i => i.entityId === collected.entityId);
        
        if (item && perigosos.some(p => item.name.toLowerCase().includes(p))) {
          console.log(`Item perigoso detectado: ${item.name}`);
          bot.chat("NEM FUDENDO QUE VOU FICAR COM ISSO, C4B4Ç0!");
          
          // Programar descarte do item
          setTimeout(() => {
            try {
              const toDiscard = bot.inventory.items().find(i => 
                perigosos.some(p => i.name.toLowerCase().includes(p))
              );
              
              if (toDiscard) {
                bot.tossStack(toDiscard);
                console.log(`Item descartado: ${toDiscard.name}`);
              }
            } catch (err) {
              console.error('Erro ao descartar item perigoso:', err);
            }
          }, 500);
        }
      }
    } catch (err) {
      console.error('Erro no evento playerCollect:', err);
    }
  });
  
  // Verificar inventário periodicamente
  setInterval(() => {
    try {
      if (bot.inventory) {
        const itemsPerigosos = bot.inventory.items().filter(item => 
          perigosos.some(p => item.name.toLowerCase().includes(p))
        );
        
        if (itemsPerigosos.length > 0) {
          bot.chat("ACHEI TNT NO MEU INVENTÁRIO! VOU JOGAR ESSA MERDA FORA!");
          
          // Descartar todos os itens perigosos
          itemsPerigosos.forEach(item => {
            bot.tossStack(item);
          });
        }
      }
    } catch (err) {
      console.error('Erro na verificação periódica de inventário:', err);
    }
  }, 30000); // Verificar a cada 30 segundos
  
  // Monitorar conversas sobre TNT ou explosões
  bot.on('chat', (username, message) => {
    try {
      if (username === bot.username) return; // Ignorar mensagens próprias
      
      const msgLower = message.toLowerCase();
      if (msgLower.includes('tnt') || 
          msgLower.includes('explos') || 
          msgLower.includes('detonar') || 
          msgLower.includes('bomba')) {
        
        // Respostas aleatórias para mensagens sobre explosivos
        const respostas = [
          "VAI EXPLODIR VC, ARROMBADO!",
          "NÃO VEM COM ESSE PAPO DE EXPLOSÃO NÃO!",
          "SE FALAR DE TNT DE NOVO EU SAIO DO SERVIDOR!",
          "EXPLOSIVO É O QUE VAI ACONTECER COM SEU PC SE CONTINUAR COM ESSE PAPO!"
        ];
        
        const resposta = respostas[Math.floor(Math.random() * respostas.length)];
        bot.chat(resposta);
      }
    } catch (err) {
      console.error('Erro no monitoramento de chat:', err);
    }
  });
  
  // Monitorar crafting
  bot.on('windowOpen', (window) => {
    try {
      if (window.type === 'crafting_table') {
        // Verificação periódica de crafting de TNT
        const checkInterval = setInterval(() => {
          const craftingTable = bot.currentWindow;
          if (!craftingTable) {
            clearInterval(checkInterval);
            return;
          }
          
          // Verificar se tem gunpowder ou TNT no grid de crafting
          const temExplosivos = craftingTable.slots.some(slot => 
            slot && (
              (slot.name && slot.name.includes('gunpowder')) ||
              (slot.name && slot.name.includes('tnt'))
            )
          );
          
          if (temExplosivos) {
            bot.chat("CRAFTAR TNT? SABE NEM JOGAR, LIXO!");
            bot.closeWindow(craftingTable);
            clearInterval(checkInterval);
          }
        }, 500);
      }
    } catch (err) {
      console.error('Erro no monitoramento de crafting:', err);
    }
  });
  
  // Adicionar métodos ao bot para lidar com TNT
  bot.isSafeTile = function(pos) {
    try {
      // Verificar se há TNT acesa próxima
      const entity = bot.nearestEntity(entity => 
        entity.name && entity.name.toLowerCase().includes('tnt') && 
        entity.position.distanceTo(pos) < 10
      );
      
      return !entity; // É seguro se não encontrar TNT
    } catch (err) {
      console.error('Erro ao verificar segurança do bloco:', err);
      return true; // Assume seguro em caso de erro
    }
  };
  
  // Reação à observação de TNT no ambiente
  bot.on('entitySpawn', (entity) => {
    try {
      if (entity.name && entity.name.toLowerCase().includes('tnt')) {
        bot.chat("TNT DETECTADA! VOU VAZAR DAQUI!");
        
        // Tentar fugir da TNT
        const pos = entity.position;
        const playerPos = bot.entity.position;
        const dirX = playerPos.x - pos.x;
        const dirZ = playerPos.z - pos.z;
        
        // Calcular posição para fugir (direção oposta à TNT)
        const dist = Math.sqrt(dirX * dirX + dirZ * dirZ);
        const moveX = playerPos.x + (dirX / dist) * 10;
        const moveZ = playerPos.z + (dirZ / dist) * 10;
        
        // Tentar se mover para longe
        try {
          bot.pathfinder.setGoal(null); // Cancelar navegação atual
          bot.lookAt(new bot.vec3(moveX, playerPos.y, moveZ));
          bot.setControlState('forward', true);
          
          // Parar de correr após 3 segundos
          setTimeout(() => {
            bot.setControlState('forward', false);
            bot.chat("ESPERO QUE ESTEJA LONGE DAQUELA MERDA!");
          }, 3000);
        } catch (e) {
          console.error('Erro ao tentar fugir da TNT:', e);
        }
      }
    } catch (err) {
      console.error('Erro no evento entitySpawn:', err);
    }
  });
};
