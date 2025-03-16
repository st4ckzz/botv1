module.exports = function(bot) {  
  bot.on('playerCollect', (collector, item) => {  
    if (item.name.includes('tnt')) {  
      bot.tossStack(item);  
      bot.chat("NEM FUDENDO QUE VOU FICAR COM ISSO, C4B4Ç0!");  
    }  
  });  

  bot.on('chat', (user, msg) => {  
    if (msg.includes('tnt') || msg.includes('explodir')) {  
      bot.chat("VAI EXPLODIR VC, ARROMBADO!");  
    }  
  });  
};  