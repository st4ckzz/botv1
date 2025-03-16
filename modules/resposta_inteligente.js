/**
 * Módulo de Resposta Inteligente - Para processamento de perguntas via APIs de IA
 * Baseado na função 1 do bot
 */

const axios = require('axios');

module.exports = function(bot, options = {}) {
  // Configurações com fallbacks
  const config = {
    deepseekApiKey: options.deepseekApiKey || process.env.DEEPSEEK_API_KEY || '',
    palavrasBloqueadas: options.palavrasBloqueadas || [],
    cooldownRespostas: options.cooldownRespostas || 3000, // 3 segundos
    botName: options.botName || 'Bot'
  };
  
  // Estado
  let ultimaResposta = 0;
  let listenerAtivo = false;
  
  /**
   * Processa perguntas através da API DeepSeek
   * @param {string} pergunta - Pergunta a ser processada
   * @returns {Promise<string>} - Resposta gerada
   */
  async function responderPergunta(pergunta) {
    // Verificar se temos uma chave de API
    if (!config.deepseekApiKey) {
      return "Não tenho API configurada para responder perguntas avançadas.";
    }
    
    try {
      const resposta = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `Responda como um especialista de Minecraft. Seja prestativo, amigável e conciso: ${pergunta}`
        }],
        temperature: 0.7,
        max_tokens: 300
      }, {
        headers: { 
          'Authorization': `Bearer ${config.deepseekApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return resposta.data.choices[0].message.content;
    } catch (err) {
      console.error('Erro ao processar resposta DeepSeek:', err);
      return "Falha na comunicação com meu cérebro artificial. Tente uma pergunta diferente.";
    }
  }
  
  /**
   * Processa mensagens de chat e responde perguntas
   * @param {string} username - Nome do usuário
   * @param {string} message - Mensagem recebida
   */
  async function processarMensagem(username, message) {
    // Ignorar mensagens próprias
    if (username === bot.username) return;
    
    // Verificar cooldown
    if (Date.now() - ultimaResposta < config.cooldownRespostas) return;
    
    // Verificar palavras bloqueadas
    if (config.palavrasBloqueadas.some(p => message.toLowerCase().includes(p))) return;
    
    // Respostas diretas para perguntas específicas
    if (message.toLowerCase().includes('onde você está') || message.toLowerCase().includes('onde voce esta')) {
      const pos = bot.entity.position;
      bot.chat(`Estou em X:${Math.round(pos.x)}, Y:${Math.round(pos.y)}, Z:${Math.round(pos.z)}. Quer minha localização exata, stalker?`);
      ultimaResposta = Date.now();
      return;
    }
    
    // Verificar se é direcionado ao bot
    const isMencionado = message.toLowerCase().includes(bot.username.toLowerCase()) || 
                        message.toLowerCase().includes(config.botName.toLowerCase());
    
    // Detectar perguntas pelo símbolo ? ou menção ao bot
    if (message.includes('?') || isMencionado) {
      const resposta = await responderPergunta(message);
      bot.chat(resposta);
      ultimaResposta = Date.now();
    }
  }
  
  /**
   * Ativa o processador de perguntas
   */
  function ativar() {
    if (listenerAtivo) return;
    
    bot.on('chat', processarMensagem);
    listenerAtivo = true;
    
    // Mensagem de boas-vindas ao ativar
    if (bot.entity) {
      bot.chat("Modo de resposta inteligente ativado! Faça perguntas sobre Minecraft.");
    }
  }
  
  /**
   * Desativa o processador de perguntas
   */
  function desativar() {
    if (!listenerAtivo) return;
    
    bot.removeListener('chat', processarMensagem);
    listenerAtivo = false;
  }
  
  /**
   * Verifica se o processador está ativo
   * @returns {boolean}
   */
  function estaAtivo() {
    return listenerAtivo;
  }
  
  /**
   * Atualiza a chave de API
   * @param {string} apiKey - Nova chave de API
   */
  function atualizarApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') return false;
    
    config.deepseekApiKey = apiKey;
    return true;
  }
  
  /**
   * Configura ou atualiza palavras bloqueadas
   * @param {string[]} palavras - Lista de palavras a bloquear
   */
  function configurarPalavrasBloqueadas(palavras) {
    if (!Array.isArray(palavras)) return false;
    
    config.palavrasBloqueadas = palavras;
    return true;
  }
  
  /**
   * Configura o tempo de cooldown entre respostas
   * @param {number} ms - Tempo em milissegundos
   */
  function configurarCooldown(ms) {
    if (!ms || ms < 0) return false;
    
    config.cooldownRespostas = ms;
    return true;
  }
  
  // Inicializar automaticamente quando o bot spawnar
  bot.once('spawn', () => {
    ativar();
  });
  
  return {
    responderPergunta,
    ativar,
    desativar,
    estaAtivo,
    atualizarApiKey,
    configurarPalavrasBloqueadas,
    configurarCooldown
  };
};