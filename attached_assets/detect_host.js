module.exports = function(bot) {  
  const hostsFree = ['aternos.me', 'server.pro', 'minehut.gg'];  

  bot.once('spawn', () => {  
    const host = bot._client.socket._host;  
    const isFree = hostsFree.some(h => host.includes(h));  

    if (isFree) {  
      bot.chat("ATERNOOOOOOS? TÁ POBRE ASSIM, IRMÃO? KKKK");  
      bot.chat("COMPRA UM HOST DE 20 CONTO, MARGINAL!");  
    }  
  });  
};  