module.exports = {  
  qLearning: function(bot) {  
    const qTable = {};  

    bot.decidirAcao = (estado) => {  
      if (!qTable[estado]) qTable[estado] = { atacar: 0, fugir: 5, minerar: 10 };  
      return Object.keys(qTable[estado]).sort((a, b) => qTable[estado][b] - qTable[estado][a])[0];  
    };  

    bot.on('entityHurt', (entity) => {  
      if (entity === bot.entity) bot.atualizarQ('combate', 'fugir', 15);  
    });  
  }  
};  