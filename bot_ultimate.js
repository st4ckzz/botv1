/**
 * Bot Ultimate - Código principal do bot Minecraft com personalidade rebelde
 * Responsável por inicializar e conectar todos os módulos
 */

const mineflayer = require('mineflayer');
const detectHost = require('./detect_host');
const antiTNT = require('./anti_tnt');
const { setupDeepseek } = require('./modules/deepseek_chat');
const { qLearning } = require('./modules/q_learning');
const { initMemory } = require('./modules/memoria');
const { setupNavegacao } = require('./modules/navegacao');
const fs = require('fs');

// Importar novos módulos baseados nas funções
const encantadorModule = require('./modules/encantador');
const skinClonerModule = require('./modules/skin_cloner');
const wandererModule = require('./modules/wanderer');
const comandoPrefixoModule = require('./modules/comando_prefixo');
const respostaInteligenteModule = require('./modules/resposta_inteligente');

// Função para criar o bot com configurações dinâmicas
function createBot(options = {}) {
  // Configurações padrão
  const defaultOptions = {
    host: process.env.MC_HOST || 'localhost',
    port: process.env.MC_PORT || 25565,
    username: process.env.MC_USERNAME || 'B0T_CH4T0',
    version: process.env.MC_VERSION || '1.21',
    auth: process.env.MC_AUTH || 'offline',
  };

  // Mesclar opções padrão com opções personalizadas
  const botOptions = { ...defaultOptions, ...options };
  
  // Criar instância do bot
  const bot = mineflayer.createBot(botOptions);
  
  // Carregar módulos básicos
  detectHost(bot);
  antiTNT(bot);
  
  // Carregar módulos avançados
  setupDeepseek(bot, process.env.DEEPSEEK_API_KEY || '');
  qLearning(bot);
  initMemory(bot);
  setupNavegacao(bot);
  
  // Carregar novos módulos baseados nas funções
  bot.encantador = encantadorModule(bot);
  bot.skinCloner = skinClonerModule(bot);
  bot.wanderer = wandererModule(bot);
  bot.comandoPrefixo = comandoPrefixoModule(bot);
  bot.respostaInteligente = respostaInteligenteModule(bot, {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || options.deepseekApiKey || '',
    botName: bot.username
  });
  
  // Configurar eventos básicos
  setupBasicEvents(bot);
  
  // Bloquear craft de TNT (movido do código principal)
  bot.on('craftingTableReady', (table) => {
    if (table.recipes && table.recipes.some(r => r.result && r.result.name.includes('tnt'))) {
      bot.chat("CRAFTAR TNT? SABE NEM JOGAR, LIXO!");
      bot.closeWindow(table);
    }
  });
  
  return bot;
}

// Configurar eventos básicos
function setupBasicEvents(bot) {
  // Evento de login
  bot.on('login', () => {
    console.log(`Bot conectado como ${bot.username}`);
    bot.chat("CHEGUEI NESSA PORRA! ALGUÉM AÍ TEM MEDO?");
  });
  
  // Evento de desconexão
  bot.on('end', () => {
    console.log('Bot desconectado');
  });
  
  // Evento de erro
  bot.on('error', (err) => {
    console.error('Erro no bot:', err);
  });
  
  // Evento de morte
  bot.on('death', () => {
    bot.chat("MORRI, MAS PASSO MELHOR QUE MUITOS VIVOS!");
  });
  
  // Evento de dano
  bot.on('hurt', () => {
    const saude = Math.floor(bot.health);
    if (saude < 8) {
      bot.chat("TÔ QUASE MORRENDO, SEUS COVARDES!");
    }
  });
  
  // Evento de chuva
  bot.on('rain', () => {
    if (bot.isRaining) {
      bot.chat("CHUVA DO CARALHO, VAI MOLHAR MEUS CIRCUITOS!");
    }
  });
  
  // Evento de dia/noite
  bot.timeOfDay = 0;
  bot.on('time', () => {
    const isNight = (bot.time.timeOfDay >= 13000 && bot.time.timeOfDay <= 23000);
    const wasNight = (bot.timeOfDay >= 13000 && bot.timeOfDay <= 23000);
    
    if (isNight && !wasNight) {
      bot.chat("ESCURECEU... HORA DOS CAGÕES TEREM MEDO!");
    } else if (!isNight && wasNight) {
      bot.chat("AMANHECEU E EU AINDA ESTOU VIVO, OTÁRIOS!");
    }
    
    bot.timeOfDay = bot.time.timeOfDay;
  });
}

// Exportar o criador de bot
module.exports = { createBot };
