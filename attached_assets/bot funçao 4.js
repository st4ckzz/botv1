const mineflayer = require('mineflayer');  

// Configurações  
const PLAYER_ALVO = 'Stackzzx';  
const NOME_SKIN = 'CyberAssassin_V2'; // Substitua pelo nome real da skin  
const PLUGINS = {  
  SkinsRestorer: `/skin set ${NOME_SKIN}`,  
  ChangeSkin: `/changeskin set ${NOME_SKIN}`,  
  SkinSystem: `/setskin ${NOME_SKIN}`  
};  

const bot = mineflayer.createBot({  
  host: 'localhost',  
  port: 25565,  
  username: 'CloneDaSkin' // Nome do bot (não precisa ser igual ao do Stackzzx)  
});  

// Detecta plugins de skin  
bot.once('spawn', () => {  
  bot.chat('/plugins');  
  bot.once('message', (msg) => {  
    const resposta = msg.toString();  
    const pluginSkin = Object.keys(PLUGINS).find(p => resposta.includes(p));  

    if (pluginSkin) {  
      bot.chat(PLUGINS[pluginSkin]);  
      console.log(`Skin clonada! Usando "${NOME_SKIN}" via ${pluginSkin}`);  
    } else {  
      console.log('Nenhum plugin de skin encontrado. Servidor fraco.');  
    }  
  });  
});  

// Tratamento de erros  
bot.on('kicked', (reason) => console.log(`Banido por clonagem: ${reason}`));  
bot.on('error', (err) => console.log(`Erro: ${err.message}`));  