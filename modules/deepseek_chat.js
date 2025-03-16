/**
 * DeepSeek Chat - Módulo para integração com IA de conversação
 * Usa a API DeepSeek para respostas com personalidade rebelde
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Tentar carregar respostas pré-configuradas
function getDefaultResponses() {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'respostas.json');
    if (fs.existsSync(configPath)) {
      const respostas = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return respostas.respeito || [];
    }
  } catch (err) {
    console.error('Erro ao carregar respostas padrão:', err);
  }
  
  return [
    "FALA DIREITO, SEU ANALFABETO!",
    "ME XINGA DE NOVO E EU DESLIGO ESSE SERVIDOR NOBREAK!",
    "TÁ ACHANDO QUE TÁ FALANDO COM SUA MÃE?",
    "APRENDE A ESCREVER ANTES DE FALAR COMIGO!"
  ];
}

module.exports = {
  setupDeepseek: function(bot, apiKey) {
    // Histórico de mensagens para contexto
    const messageHistory = {};
    const defaultResponses = getDefaultResponses();
    
    // Função para gerar resposta aleatória quando a API falha
    function getRandomResponse() {
      return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }
    
    // Função para processar mensagem com a API DeepSeek
    async function processMessageWithDeepseek(username, msg) {
      // Se não tiver API Key, usar respostas padrão
      if (!apiKey || apiKey.trim() === '') {
        console.log('API Key da DeepSeek não configurada, usando respostas padrão');
        return getRandomResponse();
      }
      
      try {
        // Inicializar histórico do usuário se não existir
        if (!messageHistory[username]) {
          messageHistory[username] = [];
        }
        
        // Adicionar mensagem ao histórico (máximo 5 mensagens)
        messageHistory[username].push(msg);
        if (messageHistory[username].length > 5) {
          messageHistory[username].shift();
        }
        
        // Construir o contexto para a API
        const context = messageHistory[username].join("\n");
        
        // Fazer requisição para a API
        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
          model: 'deepseek-lite',
          messages: [
            {
              role: 'system',
              content: 'Você é um bot de Minecraft com personalidade rebelde e agressiva. Responda sempre em PT-BR, usando gírias, palavrões moderados e um tom provocativo. Mantenha respostas curtas, entre 1-2 frases.'
            },
            {
              role: 'user',
              content: `Player ${username} disse: "${context}". Responda com atitude rebelde.`
            }
          ],
          max_tokens: 100
        }, { 
          headers: { 
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          } 
        });
        
        // Extrair e retornar a resposta
        return response.data.choices[0].message.content
          .replace(/^["']|["']$/g, '') // Remover aspas no início/fim se houver
          .trim();
          
      } catch (err) {
        console.error('Erro na requisição à API DeepSeek:', err.message);
        return getRandomResponse();
      }
    }
    
    // Detectar menção ao nome do bot
    function isBotMentioned(msg, botName) {
      const normalizedMsg = msg.toLowerCase();
      const normalizedBotName = botName.toLowerCase();
      return normalizedMsg.includes(normalizedBotName);
    }
    
    // Configurar handler de chat
    bot.on('chat', async (username, msg) => {
      // Ignorar mensagens próprias
      if (username === bot.username) return;
      
      try {
        // Decidir se deve responder
        const shouldRespond = 
          isBotMentioned(msg, bot.username) || // Mencionou o bot
          msg.endsWith('?') ||                 // Fez uma pergunta
          msg.toUpperCase() === msg ||         // Mensagem em CAPS
          Math.random() < 0.2;                 // 20% de chance aleatória
          
        if (shouldRespond) {
          // Indicar que está digitando (pequeno delay)
          bot.chat('/me está digitando...');
          
          // Obter resposta da API
          const response = await processMessageWithDeepseek(username, msg);
          
          // Responder após um pequeno delay para simular digitação
          setTimeout(() => {
            bot.chat(response);
          }, 1500 + Math.random() * 1000);
        }
      } catch (err) {
        console.error('Erro ao processar mensagem de chat:', err);
      }
    });
    
    // Adicionar método ao bot para conversa forçada
    bot.respondTo = async function(username, message) {
      try {
        const response = await processMessageWithDeepseek(username, message);
        bot.chat(response);
        return response;
      } catch (err) {
        console.error('Erro ao forçar resposta:', err);
        return getRandomResponse();
      }
    };
  }
};
