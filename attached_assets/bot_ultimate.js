const mineflayer = require('mineflayer');  
const detectHost = require('./detect_host');  
const antiTNT = require('./anti_tnt');  

const bot = mineflayer.createBot({  
  host: 'SEU_IP.aternos.me',  
  version: '1.21',  
  username: 'B0T_CH4T0'  
});  

// CARREGAR MÓDULOS  
detectHost(bot);  
antiTNT(bot);  

// BLOQUEAR CRAFT DE TNT  
bot.on('craftingTableReady', (table) => {  
  if (table.ingredients.some(i => i.name.includes('gunpowder'))) {  
    bot.chat("CRAFTAR TNT? SABE NEM JOGAR, LIXO!");  
    bot.closeContainer(table.window);  
  }  
});  