const mineflayer = require('mineflayer');  
const pathfinder = require('mineflayer-pathfinder').pathfinder;  
const Movements = require('mineflayer-pathfinder').Movements;  
const { GoalNear } = require('mineflayer-pathfinder').goals;  

const bot = mineflayer.createBot({  
  host: 'localhost', // Conexão via painel (não precisa alterar)  
  version: '1.21',  
  username: 'B0T_OBEDIENTE'  
});  

bot.loadPlugin(pathfinder);  

// VARIÁVEIS DE CONTROLE  
let tarefaAtiva = false;  
const movimentos = new Movements(bot);  

// FUNÇÃO ANDAR PARA X, Y, Z  
function navegarPara(x, y, z) {  
  bot.pathfinder.setMovements(movimentos);  
  bot.pathfinder.setGoal(new GoalNear(x, y, z, 1));  
}  

// OUVIR COMANDOS DO PLAYER  
bot.on('chat', (username, mensagem) => {  
  if (username === bot.username) return; // Ignora próprio bot  
  if (!mensagem.startsWith('!')) return; // Comandos com "!"  

  const comando = mensagem.slice(1).toLowerCase();  
  const args = comando.split(' ');  

  switch(args[0]) {  
    case 'ir':  
      if (args.length < 4) {  
        bot.chat("FALTA COORDENADAS, ZÉ MANÉ! EX: !ir 100 64 -200");  
        return;  
      }  
      const [x, y, z] = args.slice(1).map(Number);  
      navegarPara(x, y, z);  
      bot.chat(`INDO PARA X:${x}, Y:${y}, Z:${z}...`);  
      break;  

    case 'minerar':  
      const bloco = args[1] || 'diamond_ore';  
      const alvo = bot.findBlock({ matching: bloco, maxDistance: 64 });  
      if (alvo) {  
        navegarPara(alvo.position.x, alvo.position.y, alvo.position.z);  
        bot.chat(`MINERANDO ${bloco.toUpperCase()} AGORA!`);  
      } else {  
        bot.chat("NÃO ACHEI ESSA MERDA AQUI NÃO!");  
      }  
      break;  

    case 'parar':  
      bot.pathfinder.stop();  
      bot.chat("PAREI TUDO! TA BOM ASSIM?");  
      break;  

    default:  
      bot.chat("COMANDO INVALIDO, SEU JEGUE! USE !ir, !minerar, !parar");  
  }  
});  

// CONFIRMAÇÃO DE CONEXÃO  
bot.on('spawn', () => {  
  bot.chat("CONECTADO! MANDA OS COMANDOS COM '!' EX: !ir 100 64 -200");  
});  