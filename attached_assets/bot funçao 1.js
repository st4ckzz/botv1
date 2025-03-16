const mineflayer = require('mineflayer');  
const pathfinder = require('mineflayer-pathfinder').pathfinder;  
const Movements = require('mineflayer-pathfinder').Movements;  
const { GoalNear, GoalBlock } = require('mineflayer-pathfinder').goals;  
const axios = require('axios');  

const bot = mineflayer.createBot({  
  host: 'localhost',  
  port: 25565,  
  username: 'B0T_SABIDÃO',  
  version: '1.21'  
});  

bot.loadPlugin(pathfinder);  

// CONFIGURAÇÕES  
const DEEPSEEK_API_KEY = 'sk-2a8ef9d14ddb4e4c9ff7ee8e906ee1f4'; // Obtenha em: https://deepseek.com  
const PALAVRAS_BLOQUEADAS = ['', '', ''];  
let ultimaResposta = 0;  
const cooldownRespostas = 3000; // 3 segundos  

// SISTEMA DE WANDERING INTELIGENTE  
function wander() {  
  if (!bot.pathfinder.isMoving()) {  
    const x = bot.entity.position.x + (Math.random() * 40 - 20);  
    const z = bot.entity.position.z + (Math.random() * 40 - 20);  
    const y = bot.world.getHeightAt(x, z);  

    const movements = new Movements(bot);  
    movements.scafoldingBlocks = []; // Evitar escalar  
    bot.pathfinder.setMovements(movements);  

    bot.pathfinder.setGoal(new GoalNear(x, y, z, 1), true);  
    setTimeout(wander, 15000 + Math.random() * 15000); // 15-30s  
  }  
}  

// PROCESSAR PERGUNTAS COM DEEPSEEK  
async function responderPergunta(pergunta) {  
  try {  
    const resposta = await axios.post('https://api.deepseek.com/v1/chat/completions', {  
      model: 'deepseek-chat',  
      messages: [{  
        role: 'user',  
        content: `Responda como um especialista de Minecraft: ${pergunta}`  
      }],  
      temperature: 0.7  
    }, {  
      headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}` }  
    });  

    return resposta.data.choices[0].message.content;  
  } catch (err) {  
    return "Não sei responder, pergunte algo melhor.";  
  }  
}  

// SISTEMA DE CHAT REATIVO  
bot.on('chat', async (username, msg) => {  
  if (username === bot.username) return;  
  if (Date.now() - ultimaResposta < cooldownRespostas) return;  
  if (PALAVRAS_BLOQUEADAS.some(p => msg.toLowerCase().includes(p))) return;  

  // Respostas diretas  
  if (msg.toLowerCase().includes('onde você está')) {  
    const pos = bot.entity.position;  
    bot.chat(`Estou em X:${Math.round(pos.x)}, Z:${Math.round(pos.z)}. Quer minha localização exata, stalker?`);  
    return;  
  }  

  // Respostas via IA  
  if (msg.includes('?')) {  
    const resposta = await responderPergunta(msg);  
    bot.chat(resposta);  
    ultimaResposta = Date.now();  
  }  
});  

// EVENTOS ESSENCIAIS  
bot.on('spawn', () => {  
  bot.chat("Estou online! Pergunte qualquer coisa sobre Minecraft.");  
  wander();  
});  

bot.on('death', () => {  
  bot.chat("Morri... mas vou renascer mais sábio!");  
});  

bot.on('kicked', (reason) => {  
  console.log(`Expulso por: ${reason}`);  
});  

bot.on('error', console.error);  