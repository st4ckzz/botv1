const axios = require('axios');  

module.exports = {  
  setupDeepseek: function(bot, apiKey) {  
    bot.on('chat', async (user, msg) => {  
      if (user === bot.username) return;  

      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {  
        model: 'deepseek-lite',  
        messages: [{  
          role: 'user',  
          content: `[MODO: REBELDE] Player disse: "${msg}". Responda em PT-BR com gírias.`  
        }]  
      }, { headers: { Authorization: `Bearer ${apiKey}` } });  

      bot.chat(response.data.choices[0].message.content);  
    });  
  }  
};  