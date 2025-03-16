const mineflayer = require('mineflayer');  
const pathfinder = require('mineflayer-pathfinder').pathfinder;  
const Movements = require('mineflayer-pathfinder').Movements;  
const { GoalNear, GoalBlock } = require('mineflayer-pathfinder').goals;  
const autoReconnect = require('mineflayer-auto-reconnect');  

const bot = mineflayer.createBot({  
  host: 'localhost',  
  port: 25565,  
  username: 'B0T_TERMINAL',  
  version: '1.21'  
});  

bot.loadPlugin(pathfinder);  
bot.loadPlugin(autoReconnect);  

// CONFIGURAÇÕES  
const PREFIXO = '!';  
let tarefaAtiva = false;  
const cooldown = 2000; // 2 segundos  
let ultimoComando = 0;  

// SISTEMA DE COMANDOS  
const comandos = {  
  ir: (x, y, z) => {  
    bot.chat(`INDO PARA X:${x}, Y:${y}, Z:${z}`);  
    const movements = new Movements(bot);  
    bot.pathfinder.setGoal(new GoalNear(x, y, z, 1));  
    tarefaAtiva = true;  
  },  

  minerar: (bloco) => {  
    const alvo = bot.findBlock({ matching: bloco, maxDistance: 64 });  
    if (alvo) {  
      bot.chat(`MINERANDO ${bloco.toUpperCase()}...`);  
      bot.pathfinder.setGoal(new GoalBlock(alvo.position.x, alvo.position.y, alvo.position.z));  
      tarefaAtiva = true;  
    } else {  
      bot.chat(`NÃO ACHEI ${bloco.toUpperCase()} AQUI!`);  
    }  
  },  

  parar: () => {  
    bot.pathfinder.stop();  
    bot.chat("PAREI TUDO, CHEFE!");  
    tarefaAtiva = false;  
  },  

  status: () => {  
    const pos = bot.entity.position;  
    bot.chat(`POSIÇÃO: X${Math.round(pos.x)} Y${Math.round(pos.y)} Z${Math.round(pos.z)} | TAREFA: ${tarefaAtiva ? 'ATIVA' : 'OCIOSO'}`);  
  },  

  ajuda: () => {  
    bot.chat("COMANDOS: !ir X Y Z, !minerar BLOCO, !parar, !status, !matar MOB, !construir BLOCO QTD");  
  },  

  matar: (mob) => {  
    const alvo = bot.nearestEntity(e => e.name === mob);  
    if (alvo) {  
      bot.chat(`CAÇANDO ${mob.toUpperCase()}...`);  
      bot.pathfinder.setGoal(new GoalNear(alvo.position.x, alvo.position.y, alvo.position.z, 1));  
      tarefaAtiva = true;  
    } else {  
      bot.chat(`${mob.toUpperCase()}? NEM VI ESSA PORRA!`);  
    }  
  },  

  construir: (bloco, qtd) => {  
    if (!bot.inventory.items().find(i => i.name === bloco)) {  
      bot.chat(`NÃO TENHO ${bloco.toUpperCase()} NO INVENTÁRIO!`);  
      return;  
    }  
    bot.chat(`CONSTRUINDO ${qtd} BLOCOS DE ${bloco.toUpperCase()}...`);  
    // Lógica de construção aqui  
  }  
};  

// PROCESSADOR DE COMANDOS  
bot.on('chat', (username, msg) => {  
  if (username === bot.username || !msg.startsWith(PREFIXO)) return;  
  if (Date.now() - ultimoComando < cooldown) return;  

  ultimoComando = Date.now();  
  const args = msg.slice(PREFIXO.length).split(' ');  
  const [comando, ...params] = args;  

  if (comandos[comando]) {  
    comandos[comando](...params);  
  } else {  
    bot.chat(`COMANDO ${comando.toUpperCase()} NÃO EXISTE! DIGITE !ajuda`);  
  }  
});  

// ANTI-FLOOD + AUTO-RECONEXÃO  
bot.autoReconnect.options = { reconnectTimeout: 10000 };  
bot.on('spawn', () => bot.chat("CONEXÃO ESTABELECIDA! DIGITE !ajuda"));  