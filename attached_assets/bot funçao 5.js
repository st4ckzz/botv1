const mineflayer = require('mineflayer');  

const bot = mineflayer.createBot({  
  host: 'localhost',  
  port: 25565,  
  username: 'EncantadorPRO',  
  version: '1.21'  
});  

// LISTA DE ENCANTAMENT0S MAXIM0S  
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

// FUNÇÃO PARA SEGURAR ITEM NA MÃ0  
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

// ENCANTAR CADA ITEM MET0DICAMENTE  
async function encantarInventario() {  
  for (const item of bot.inventory.items()) {  
    const tipo = Object.keys(ENCANTAMENTOS).find(key => item.name.includes(key));  

    if (tipo && ENCANTAMENTOS[tipo]) {  
      const equipou = await segurarItem(item);  
      if (!equipou) continue;  

      // APLICAR ENCANTAMENT0S UM POR UM  
      for (const encant of ENCANTAMENTOS[tipo]) {  
        bot.chat(`/enchant @s ${encant} 32767`);  
        console.log(`Aplicando ${encant} em ${item.name}`);  
        await new Promise(resolve => setTimeout(resolve, 500)); // EVITA FLOOD  
      }  
    }  
  }  
  bot.chat("ENCANTAMENTOS CONCLUÍDOS. SEUS ITENS SÃO DEUSES AGORA.");  
}  

// LOOP DE ENCANTAMENT0 (5 EM 5 MINUT0S)  
bot.on('spawn', () => {  
  encantarInventario();  
  setInterval(encantarInventario, 300000);  
});  

// IGNORAR ERROS (V0CÊ VAI PRECISAR)  
bot.on('kicked', (reason) => console.log(`BANID0 P0R SER MUIT0 P0DER0S0: ${reason}`));  
bot.on('error', (err) => console.log(`ERRO EPIC0: ${err.message}`));  