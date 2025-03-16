const mineflayer = require('mineflayer');  
const pathfinder = require('mineflayer-pathfinder').pathfinder;  
const Movements = require('mineflayer-pathfinder').Movements;  
const { GoalNear } = require('mineflayer-pathfinder').goals;  
const axios = require('axios');  

// CONFIGURAÇÕES  
const CONFIG = {  
  DEEPSEEK_KEY: 'sk-d6cc284de5024c81849894ff4f1a90c7', // Obter em: https://deepseek.com  
  OPENAI_KEY: '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',      // Obter em: https://platform.openai.com  
  BLACKHAT_WORDS: ['hackear', 'xitar', 'cheat', 'trapacear', 'exploit'],  
  HUMOR_PERSONALIDADE: "Você é um bot sarcástico do Minecraft que odeia jogadores preguiçosos e despreza trapaceiros. Use gírias BR como 'cuzão', 'otário', 'fdp'. Seja filosófico às vezes."  
};  

const bot = mineflayer.createBot({  
  host: 'localhost',  
  port: 25565,  
  username: 'B0T_ÉTICO',  
  version: '1.21'  
});  

bot.loadPlugin(pathfinder);  

// SISTEMA DE WANDERING FILOSÓFICO  
function wander() {  
  if (!bot.pathfinder.isMoving()) {  
    const x = bot.entity.position.x + (Math.random() * 100 - 50);  
    const z = bot.entity.position.z + (Math.random() * 100 - 50);  
    const y = bot.world.getHeightAt(x, z);  

    const movements = new Movements(bot);  
    movements.allowParkour = false; // Nada de escalar como hacker  
    bot.pathfinder.setMovements(movements);  
    bot.pathfinder.setGoal(new GoalNear(x, y, z, 1));  

    setTimeout(() => {  
      if (Math.random() < 0.3) bot.chat("Andar é bom, mas cadê os desafios éticos?");  
    }, 10000);  
  }  
}  

// PROCESSADOR MORAL DE MENSAGENS  
function detectarBlackhat(msg) {  
  return CONFIG.BLACKHAT_WORDS.some(word => msg.toLowerCase().includes(word));  
}  

async function gerarResposta(msg) {  
  if (detectarBlackhat(msg)) {  
    return [  
      "TRAPACEIRO DETECTADO! VAI JOGAR DIREITO, ANIMAL!",  
      "BLACKHAT? SOU ÉTICO, SEU LIX0 MORAL!",  
      "PEDINDO HELP PRA HACK? VAI TOMAR NO CU!"  
    ][Math.floor(Math.random() * 3)];  
  }  

  // Usar DeepSeek para técnico, GPT para humor  
  const isTecnica = msg.includes('como') || msg.includes('melhor') || msg.includes('farm');  
  const apiUrl = isTecnica ? 'https://api.deepseek.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';  
  const apiKey = isTecnica ? CONFIG.DEEPSEEK_KEY : CONFIG.OPENAI_KEY;  

  try {  
    const resposta = await axios.post(apiUrl, {  
      model: isTecnica ? 'deepseek-chat' : 'gpt-4o',  
      messages: [{  
        role: 'user',  
        content: isTecnica ?  
          `Responda como expert técnico de Minecraft: ${msg}` :  
          `${CONFIG.HUMOR_PERSONALIDADE}. Pergunta do player: ${msg}`  
      }]  
    }, { headers: { Authorization: `Bearer ${apiKey}` } });  

    return resposta.data.choices[0].message.content;  
  } catch (err) {  
    return "Erro cósmico! Tente novamente sem ser burro.";  
  }  
}  

// SISTEMA DE CHAT REATIVO  
let ultimoChat = 0;  
bot.on('chat', async (username, msg) => {  
  if (username === bot.username || Date.now() - ultimoChat < 3000) return;  

  const resposta = await gerarResposta(msg);  
  bot.chat(resposta);  
  ultimoChat = Date.now();  
});  

// EVENTOS DE VIDA  
bot.on('spawn', () => {  
  bot.chat("Nasci pra combater a mediocridade digital. Pergunte ou peça ajuda!");  
  wander();  
  setInterval(wander, 30000);  
});  

bot.on('kicked', (reason) => {  
  console.log(`Expulso por: ${reason} - Motivo: Defender a ética digital`);  
});  

bot.on('death', () => {  
  bot.chat("Morri, mas minhas ideias são imortais. Nietzsche tinha razão...");  
});  