/**
 * Index - Arquivo principal para iniciar o bot e o painel de controle
 * Configura e gerencia a instância do bot e o servidor web
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const session = require('express-session');
const { createBot } = require('./bot_ultimate');
const fs = require('fs');
const path = require('path');

// Criar aplicação Express
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configurar middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'jokerbot-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Configurações padrão para o bot
const defaultConfig = {
  host: process.env.MC_HOST || 'localhost',
  port: parseInt(process.env.MC_PORT || '25565'),
  username: process.env.MC_USERNAME || 'B0T_CH4T0',
  version: process.env.MC_VERSION || '1.21',
};

// Variáveis globais
let bot = null;
let reconnectAttempts = 0;
let MAX_RECONNECT_ATTEMPTS = 5;
let isReconnecting = false;
let botOptions = {};
let antiAfkEnabled = false;
let antiAfkInterval = null;

console.log('Iniciando servidor do Painel de Controle e Bot...');
console.log('Configurações padrão:');
console.log(`  Host: ${defaultConfig.host}`);
console.log(`  Porta: ${defaultConfig.port}`);
console.log(`  Username: ${defaultConfig.username}`);
console.log(`  Versão: ${defaultConfig.version}`);
console.log(`  API DeepSeek: ${process.env.DEEPSEEK_API_KEY ? 'Configurada' : 'Não configurada'}`);

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('Nova conexão ao painel de controle');
  
  // Enviar status atual do bot
  emitBotStatus(socket);
  
  // Handle bot connection request
  socket.on('bot:connect', (data) => {
    console.log('Solicitação de conexão recebida:', data);
    
    botOptions = {
      host: data.server || defaultConfig.host,
      port: data.port || defaultConfig.port,
      username: data.username || defaultConfig.username,
      version: data.version || defaultConfig.version,
      options: data.options || {}
    };
    
    // Definir máximo de tentativas de reconexão
    if (botOptions.options.reconnectAttempts) {
      MAX_RECONNECT_ATTEMPTS = parseInt(botOptions.options.reconnectAttempts);
    }
    
    // Verificar se o bot já está conectado
    if (bot && bot.entity) {
      socket.emit('bot:message', { 
        source: 'Sistema',
        message: 'Bot já está conectado. Desconectando para reconectar com novas configurações.',
        type: 'info'
      });
      
      try {
        bot.quit();
      } catch (err) {
        console.error('Erro ao desconectar bot:', err);
      }
    } else {
      startBot(socket);
    }
  });
  
  // Handle bot disconnection
  socket.on('bot:disconnect', () => {
    if (bot) {
      socket.emit('bot:message', { 
        source: 'Sistema',
        message: 'Desconectando do servidor...',
        type: 'info'
      });
      
      try {
        stopAntiAfk();
        bot.quit();
        bot = null;
        socket.emit('bot:status', 'offline');
      } catch (err) {
        console.error('Erro ao desconectar bot:', err);
        socket.emit('bot:error', 'Erro ao desconectar: ' + err.message);
      }
    } else {
      socket.emit('bot:message', { 
        source: 'Sistema',
        message: 'Bot não está conectado.',
        type: 'warning'
      });
    }
  });
  
  // Handle bot commands
  socket.on('bot:command', (data) => {
    if (!bot) {
      socket.emit('bot:error', 'Bot não está conectado.');
      return;
    }
    
    handleBotCommand(socket, data.command);
  });
  
  // Obter posição atual do bot
  socket.on('bot:getPosition', () => {
    if (!bot || !bot.entity) {
      socket.emit('bot:position', null);
      return;
    }
    
    socket.emit('bot:position', {
      x: bot.entity.position.x,
      y: bot.entity.position.y,
      z: bot.entity.position.z
    });
  });
  
  // Obter status de navegação
  socket.on('bot:getNavStatus', () => {
    if (!bot || !bot.navegacao) {
      socket.emit('bot:navStatus', { active: false, destination: null });
      return;
    }
    
    const estaAtivo = typeof bot.navegacao.estaAtivo === 'function' 
      ? bot.navegacao.estaAtivo() 
      : false;
      
    const destino = typeof bot.navegacao.destino === 'function' 
      ? bot.navegacao.destino() 
      : null;
    
    socket.emit('bot:navStatus', {
      active: estaAtivo,
      destination: destino
    });
  });
  
  // Obter status de mineração
  socket.on('bot:getMiningStatus', () => {
    if (!bot || !bot.navegacao) {
      socket.emit('bot:miningStatus', { active: false, target: null });
      return;
    }
    
    // Mineração e navegação compartilham status
    const estaAtivo = typeof bot.navegacao.estaAtivo === 'function' 
      ? bot.navegacao.estaAtivo() 
      : false;
      
    // Verificar qual comando está em uso
    let statusMineracao = {
      active: estaAtivo,
      target: null
    };
    
    // Se estiver ativo, tentar determinar o alvo da mineração
    // (Isso é uma implementação básica, idealmente o módulo deveria rastrear o alvo)
    if (estaAtivo && bot._lastMiningTarget) {
      statusMineracao.target = bot._lastMiningTarget;
    }
    
    socket.emit('bot:miningStatus', statusMineracao);
  });
  
  // Handle settings update
  socket.on('bot:updateSettings', (settings) => {
    if (settings.apiKey && settings.apiKey.trim() !== '') {
      process.env.DEEPSEEK_API_KEY = settings.apiKey.trim();
      socket.emit('bot:message', { 
        source: 'Sistema',
        message: 'Chave API DeepSeek atualizada.',
        type: 'success'
      });
      socket.emit('deepseek:status', 'available');
    }
    
    if (settings.personalityLevel) {
      if (bot && bot.memoria) {
        try {
          bot.personalityLevel = parseInt(settings.personalityLevel);
          socket.emit('bot:message', { 
            source: 'Sistema',
            message: `Nível de personalidade atualizado para ${settings.personalityLevel}.`,
            type: 'success'
          });
        } catch (err) {
          console.error('Erro ao atualizar personalidade:', err);
        }
      }
    }
    
    if (settings.antiTNT !== undefined && bot && bot.antiTNT) {
      bot.antiTNT.enabled = settings.antiTNT;
      socket.emit('bot:message', { 
        source: 'Sistema',
        message: `Proteção Anti-TNT ${settings.antiTNT ? 'ativada' : 'desativada'}.`,
        type: 'success'
      });
    }
    
    if (settings.autoReconnect !== undefined) {
      botOptions.options.autoReconnect = settings.autoReconnect;
      socket.emit('bot:message', { 
        source: 'Sistema',
        message: `Reconexão automática ${settings.autoReconnect ? 'ativada' : 'desativada'}.`,
        type: 'success'
      });
    }
    
    if (settings.reconnectAttempts) {
      MAX_RECONNECT_ATTEMPTS = parseInt(settings.reconnectAttempts);
      socket.emit('bot:message', { 
        source: 'Sistema',
        message: `Tentativas máximas de reconexão definidas para ${settings.reconnectAttempts}.`,
        type: 'success'
      });
    }
  });
  
  // Disconnect event
  socket.on('disconnect', () => {
    console.log('Cliente desconectado do painel de controle');
  });
});

// Função para iniciar o bot
function startBot(socket) {
  try {
    reconnectAttempts++;
    console.log(`Tentativa de conexão ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
    
    if (socket) {
      socket.emit('bot:status', 'connecting');
      socket.emit('bot:message', { 
        source: 'Sistema',
        message: `Tentando conectar a ${botOptions.host}:${botOptions.port} como ${botOptions.username}...`,
        type: 'info'
      });
    }
    
    // Criar nova instância do bot
    bot = createBot({
      host: botOptions.host || defaultConfig.host,
      port: botOptions.port || defaultConfig.port,
      username: botOptions.username || defaultConfig.username,
      version: botOptions.version || defaultConfig.version,
      antiTNT: {
        enabled: botOptions.options && botOptions.options.antiTNT !== undefined 
          ? botOptions.options.antiTNT 
          : true
      },
      personalityLevel: botOptions.options && botOptions.options.personalityLevel 
        ? parseInt(botOptions.options.personalityLevel) 
        : 8,
      deepseekApiKey: botOptions.options && botOptions.options.apiKey 
        ? botOptions.options.apiKey 
        : process.env.DEEPSEEK_API_KEY
    });
    
    // Configurar eventos do bot
    setupBotEvents(socket);
    
  } catch (err) {
    console.error('Erro ao iniciar o bot:', err);
    
    if (socket) {
      socket.emit('bot:error', 'Erro ao conectar: ' + err.message);
      socket.emit('bot:status', 'offline');
    }
    
    handleReconnect(socket);
  }
}

// Configurar eventos do bot
function setupBotEvents(socket) {
  // Evento de login/spawn
  bot.once('spawn', () => {
    console.log('Bot conectado com sucesso!');
    reconnectAttempts = 0;
    isReconnecting = false;
    
    // Broadcast para todos os clientes
    io.emit('bot:status', 'online');
    io.emit('bot:message', { 
      source: 'Sistema',
      message: `Conectado ao servidor como ${bot.username}!`,
      type: 'success'
    });
    
    // Enviar informações do servidor
    const serverInfo = {
      address: botOptions.host,
      version: bot.version,
      players: Object.keys(bot.players).length,
      maxPlayers: 100 // A maioria dos servidores não expõe esse valor diretamente
    };
    io.emit('server:info', serverInfo);
    
    // Inicializar estatísticas do bot
    updateBotStats();
    
    // Verificar DeepSeek API
    if (process.env.DEEPSEEK_API_KEY || (botOptions.options && botOptions.options.apiKey)) {
      io.emit('deepseek:status', 'available');
    } else {
      io.emit('deepseek:status', 'unavailable');
    }
  });
  
  // Evento de desconexão
  bot.on('end', () => {
    console.log('Bot desconectado.');
    stopAntiAfk();
    
    io.emit('bot:message', { 
      source: 'Sistema',
      message: 'Desconectado do servidor.',
      type: 'warning'
    });
    io.emit('bot:status', 'offline');
    
    handleReconnect();
  });
  
  // Evento de erro
  bot.on('error', (err) => {
    console.error('Erro crítico do bot:', err);
    
    io.emit('bot:error', `Erro: ${err.message}`);
    handleReconnect();
  });
  
  // Eventos de chat
  bot.on('chat', (username, message) => {
    if (username === bot.username) return; // Ignorar mensagens próprias
    
    io.emit('bot:chat', {
      username,
      message
    });
  });
  
  // Evento de atualização de saúde
  bot.on('health', () => {
    updateBotStats();
  });
  
  // Evento de experiência
  bot.on('experience', () => {
    updateBotStats();
  });
  
  // Monitorar jogadores
  bot.on('playerJoined', (player) => {
    io.emit('bot:message', { 
      source: 'Servidor',
      message: `${player.username} entrou no jogo.`,
      type: 'info'
    });
    
    // Atualizar contagem de jogadores nas informações do servidor
    const serverInfo = {
      players: Object.keys(bot.players).length
    };
    io.emit('server:info', serverInfo);
  });
  
  bot.on('playerLeft', (player) => {
    io.emit('bot:message', { 
      source: 'Servidor',
      message: `${player.username} saiu do jogo.`,
      type: 'info'
    });
    
    // Atualizar contagem de jogadores nas informações do servidor
    const serverInfo = {
      players: Object.keys(bot.players).length
    };
    io.emit('server:info', serverInfo);
  });
}

// Função para reconectar o bot
function handleReconnect(socket) {
  if (isReconnecting) return;
  
  const shouldReconnect = botOptions.options && 
                         botOptions.options.autoReconnect !== undefined ? 
                         botOptions.options.autoReconnect : true;
  
  if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    isReconnecting = true;
    const delay = reconnectAttempts * 5000; // Aumenta o tempo entre tentativas
    
    console.log(`Tentando reconectar em ${delay/1000} segundos...`);
    if (socket) {
      socket.emit('bot:message', { 
        source: 'Sistema',
        message: `Tentando reconectar em ${delay/1000} segundos... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
        type: 'info'
      });
    } else {
      io.emit('bot:message', { 
        source: 'Sistema',
        message: `Tentando reconectar em ${delay/1000} segundos... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
        type: 'info'
      });
    }
    
    setTimeout(() => {
      isReconnecting = false;
      startBot(socket);
    }, delay);
  } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('Número máximo de tentativas de reconexão atingido.');
    if (socket) {
      socket.emit('bot:message', { 
        source: 'Sistema',
        message: 'Número máximo de tentativas de reconexão atingido.',
        type: 'error'
      });
      socket.emit('bot:status', 'offline');
    } else {
      io.emit('bot:message', { 
        source: 'Sistema',
        message: 'Número máximo de tentativas de reconexão atingido.',
        type: 'error'
      });
      io.emit('bot:status', 'offline');
    }
  }
}

// Função para atualizar estatísticas do bot
function updateBotStats() {
  if (!bot || !bot.entity) return;
  
  const stats = {
    health: bot.health || 0,
    food: bot.food || 0,
    xp: bot.experience.level || 0
  };
  
  io.emit('bot:stats', stats);
}

// Função para enviar status atual do bot para um socket específico
function emitBotStatus(socket) {
  if (bot && bot.entity) {
    socket.emit('bot:status', 'online');
    
    // Enviar informações do servidor
    const serverInfo = {
      address: botOptions.host || defaultConfig.host,
      version: bot.version,
      players: Object.keys(bot.players).length,
      maxPlayers: 100
    };
    socket.emit('server:info', serverInfo);
    
    // Enviar estatísticas
    const stats = {
      health: bot.health || 0,
      food: bot.food || 0,
      xp: bot.experience.level || 0
    };
    socket.emit('bot:stats', stats);
    
    // Status da API DeepSeek
    if (process.env.DEEPSEEK_API_KEY || (botOptions.options && botOptions.options.apiKey)) {
      socket.emit('deepseek:status', 'available');
    } else {
      socket.emit('deepseek:status', 'unavailable');
    }
  } else if (isReconnecting) {
    socket.emit('bot:status', 'connecting');
  } else {
    socket.emit('bot:status', 'offline');
  }
}

// Função para processar comandos do bot
function handleBotCommand(socket, command) {
  if (!bot) {
    socket.emit('bot:error', 'Bot não está conectado.');
    return;
  }
  
  const cmd = command.toLowerCase().split(' ')[0];
  const args = command.split(' ').slice(1);
  
  // Comandos de navegação e mineração
  if (cmd === 'goto' || cmd === 'ir') {
    if (args.length >= 3) {
      const x = parseInt(args[0]);
      const y = parseInt(args[1]);
      const z = parseInt(args[2]);
      
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        if (bot.navegacao && bot.navegacao.irPara) {
          const sucesso = bot.navegacao.irPara(x, y, z);
          if (sucesso) {
            socket.emit('bot:message', { 
              source: 'Navegação',
              message: `Indo para X:${x}, Y:${y}, Z:${z}`,
              type: 'info'
            });
          } else {
            socket.emit('bot:message', { 
              source: 'Erro',
              message: 'Falha ao iniciar navegação. Verifique se o plugin pathfinder está carregado.',
              type: 'error'
            });
          }
        } else {
          socket.emit('bot:message', { 
            source: 'Erro',
            message: 'Módulo de navegação não está disponível.',
            type: 'error'
          });
        }
      } else {
        socket.emit('bot:message', { 
          source: 'Erro',
          message: 'Coordenadas inválidas. Use números válidos.',
          type: 'error'
        });
      }
    } else {
      socket.emit('bot:message', { 
        source: 'Erro',
        message: 'Formato incorreto. Use: goto X Y Z',
        type: 'error'
      });
    }
    return;
  }
  
  if (cmd === 'minerar') {
    if (args.length >= 1) {
      const tipoBloco = args[0];
      if (bot.navegacao && bot.navegacao.minerar) {
        // Armazenar o alvo de mineração para recuperação posterior
        bot._lastMiningTarget = tipoBloco;
        
        const sucesso = bot.navegacao.minerar(tipoBloco);
        if (sucesso) {
          socket.emit('bot:message', { 
            source: 'Mineração',
            message: `Procurando ${tipoBloco} para minerar`,
            type: 'info'
          });
        } else {
          socket.emit('bot:message', { 
            source: 'Erro',
            message: `Não foi possível encontrar ${tipoBloco} nas proximidades.`,
            type: 'warning'
          });
          bot._lastMiningTarget = null;
        }
      } else {
        socket.emit('bot:message', { 
          source: 'Erro',
          message: 'Módulo de navegação não está disponível.',
          type: 'error'
        });
      }
    } else {
      socket.emit('bot:message', { 
        source: 'Erro',
        message: 'Formato incorreto. Use: minerar <tipo_bloco>',
        type: 'error'
      });
    }
    return;
  }
  
  if (cmd === 'parar') {
    if (bot.navegacao && bot.navegacao.parar) {
      bot.navegacao.parar();
      bot._lastMiningTarget = null; // Limpar o alvo de mineração
      socket.emit('bot:message', { 
        source: 'Navegação',
        message: 'Navegação e/ou mineração interrompida',
        type: 'info'
      });
    }
    return;
  }
  
  try {
    switch (cmd) {
      case 'chat':
        const chatMessage = args.join(' ');
        if (chatMessage) {
          bot.chat(chatMessage);
          socket.emit('bot:message', { 
            source: 'Chat',
            message: `${bot.username}: ${chatMessage}`,
            type: 'chat'
          });
        }
        break;
        
      case 'whisper':
        if (args.length >= 2) {
          const player = args[0];
          const message = args.slice(1).join(' ');
          bot.whisper(player, message);
          socket.emit('bot:message', { 
            source: 'Privado',
            message: `Para ${player}: ${message}`,
            type: 'chat'
          });
        }
        break;
        
      case 'look':
        if (args.length > 0) {
          const target = args[0];
          // Procurar entidade pelo nome
          const entity = Object.values(bot.entities).find(
            e => e.name && e.name.toLowerCase().includes(target.toLowerCase())
          );
          
          if (entity) {
            bot.lookAt(entity.position);
            socket.emit('bot:message', { 
              source: 'Bot',
              message: `Olhando para ${entity.name}`,
              type: 'info'
            });
          } else {
            socket.emit('bot:message', { 
              source: 'Bot',
              message: `Entidade "${target}" não encontrada.`,
              type: 'warning'
            });
          }
        }
        break;
        
      case 'follow':
        if (args.length > 0) {
          const targetName = args[0];
          // Procurar jogador pelo nome
          const player = Object.values(bot.players).find(
            p => p.username.toLowerCase().includes(targetName.toLowerCase())
          );
          
          if (player && player.entity) {
            bot.pathfinder.setGoal(null); // Cancela qualquer navegação anterior
            
            // Iniciar seguimento
            const followInterval = setInterval(() => {
              if (!bot.players[player.username] || !bot.players[player.username].entity) {
                clearInterval(followInterval);
                socket.emit('bot:message', { 
                  source: 'Bot',
                  message: `Jogador ${targetName} não está mais visível.`,
                  type: 'warning'
                });
                return;
              }
              
              bot.lookAt(player.entity.position);
              bot.pathfinder.setGoal(null); // Reseta o pathfinder
              bot.pathfinder.goto(player.entity.position);
            }, 1000);
            
            socket.emit('bot:message', { 
              source: 'Bot',
              message: `Seguindo ${player.username}`,
              type: 'info'
            });
          } else {
            socket.emit('bot:message', { 
              source: 'Bot',
              message: `Jogador "${targetName}" não encontrado.`,
              type: 'warning'
            });
          }
        }
        break;
        
      case 'list':
        const playerList = Object.keys(bot.players).join(', ');
        socket.emit('bot:message', { 
          source: 'Bot',
          message: `Jogadores online: ${playerList || 'Nenhum'}`,
          type: 'info'
        });
        break;
        
      case 'inventario':
        const items = bot.inventory.items();
        if (items.length === 0) {
          socket.emit('bot:message', { 
            source: 'Bot',
            message: 'Inventário vazio.',
            type: 'info'
          });
        } else {
          const itemList = items.map(item => `${item.name} x${item.count}`).join('\n');
          socket.emit('bot:message', { 
            source: 'Bot',
            message: `Inventário:\n${itemList}`,
            type: 'info'
          });
        }
        break;
        
      case 'antiafk':
        toggleAntiAfk(socket);
        break;
      
      case 'goto':
      case 'ir':
        if (!bot.navegacao) {
          socket.emit('bot:message', { 
            source: 'Sistema',
            message: 'Módulo de navegação não está disponível.',
            type: 'error'
          });
          break;
        }
        
        if (args.length >= 3) {
          const x = parseInt(args[0]);
          const y = parseInt(args[1]);
          const z = parseInt(args[2]);
          
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            const sucesso = bot.navegacao.irPara(x, y, z);
            if (sucesso) {
              socket.emit('bot:message', { 
                source: 'Bot',
                message: `Navegando para X:${x}, Y:${y}, Z:${z}...`,
                type: 'info'
              });
            } else {
              socket.emit('bot:message', { 
                source: 'Bot',
                message: 'Falha ao iniciar navegação.',
                type: 'error'
              });
            }
          } else {
            socket.emit('bot:message', { 
              source: 'Sistema',
              message: 'Coordenadas inválidas. Use: goto X Y Z (números)',
              type: 'warning'
            });
          }
        } else {
          socket.emit('bot:message', { 
            source: 'Sistema',
            message: 'Coordenadas insuficientes. Use: goto X Y Z',
            type: 'warning'
          });
        }
        break;
        
      case 'minerar':
        if (!bot.navegacao) {
          socket.emit('bot:message', { 
            source: 'Sistema',
            message: 'Módulo de navegação não está disponível.',
            type: 'error'
          });
          break;
        }
        
        if (args.length >= 1) {
          const tipoBloco = args[0];
          const sucesso = bot.navegacao.minerar(tipoBloco);
          
          if (sucesso) {
            socket.emit('bot:message', { 
              source: 'Bot',
              message: `Procurando e minerando blocos do tipo "${tipoBloco}"...`,
              type: 'info'
            });
          } else {
            socket.emit('bot:message', { 
              source: 'Bot',
              message: `Não foi possível encontrar blocos do tipo "${tipoBloco}" nas proximidades.`,
              type: 'warning'
            });
          }
        } else {
          socket.emit('bot:message', { 
            source: 'Sistema',
            message: 'Especifique o tipo de bloco. Use: minerar <tipo_bloco>',
            type: 'warning'
          });
        }
        break;
        
      case 'parar':
        if (bot.navegacao) {
          const sucesso = bot.navegacao.parar();
          if (sucesso) {
            socket.emit('bot:message', { 
              source: 'Bot',
              message: 'Navegação interrompida.',
              type: 'info'
            });
          }
        }
        break;
        
      case 'help':
        const helpMsg = `
Comandos disponíveis:
- chat <mensagem> - Envia mensagem no chat
- whisper <jogador> <mensagem> - Envia mensagem privada
- look <entidade> - Olha para uma entidade
- follow <jogador> - Segue um jogador
- list - Lista jogadores online
- inventario - Mostra itens no inventário
- antiafk - Ativa/desativa modo anti-AFK
- goto <x> <y> <z> - Navega para coordenadas específicas
- ir <x> <y> <z> - Alias para goto
- minerar <tipo_bloco> - Procura e minera blocos do tipo especificado
- parar - Interrompe a navegação atual
- reconectar - Reconecta ao servidor
`;
        socket.emit('bot:message', { 
          source: 'Sistema',
          message: helpMsg,
          type: 'info'
        });
        break;
        
      case 'reconectar':
        socket.emit('bot:message', { 
          source: 'Sistema',
          message: 'Reconectando...',
          type: 'info'
        });
        
        try {
          stopAntiAfk();
          bot.quit();
          reconnectAttempts = 0; // Resetar tentativas para tentar como nova conexão
          setTimeout(() => {
            startBot(socket);
          }, 2000);
        } catch (err) {
          console.error('Erro ao reconectar:', err);
          socket.emit('bot:error', 'Erro ao reconectar: ' + err.message);
        }
        break;
        
      default:
        // Para comandos não reconhecidos, tenta enviar diretamente como chat
        if (cmd.startsWith('/')) {
          bot.chat(command);
          socket.emit('bot:message', { 
            source: 'Comando',
            message: command,
            type: 'chat'
          });
        } else {
          socket.emit('bot:message', { 
            source: 'Sistema',
            message: `Comando desconhecido: ${cmd}. Digite 'help' para ajuda.`,
            type: 'warning'
          });
        }
    }
  } catch (err) {
    console.error('Erro ao executar comando:', err);
    socket.emit('bot:error', 'Erro ao executar comando: ' + err.message);
  }
}

// Função para alternar modo Anti-AFK
function toggleAntiAfk(socket) {
  if (antiAfkEnabled) {
    stopAntiAfk();
    socket.emit('bot:message', { 
      source: 'Sistema',
      message: 'Modo Anti-AFK desativado.',
      type: 'info'
    });
  } else {
    startAntiAfk(socket);
    socket.emit('bot:message', { 
      source: 'Sistema',
      message: 'Modo Anti-AFK ativado.',
      type: 'success'
    });
  }
}

// Função para iniciar Anti-AFK
function startAntiAfk(socket) {
  if (!bot || antiAfkEnabled) return;
  
  antiAfkEnabled = true;
  let movementCounter = 0;
  
  antiAfkInterval = setInterval(() => {
    if (!bot || !bot.entity) {
      stopAntiAfk();
      return;
    }
    
    movementCounter++;
    
    try {
      switch (movementCounter % 8) {
        case 0: bot.setControlState('forward', true); break;
        case 1: bot.setControlState('forward', false); break;
        case 2: bot.setControlState('back', true); break;
        case 3: bot.setControlState('back', false); break;
        case 4: bot.setControlState('left', true); break;
        case 5: bot.setControlState('left', false); break;
        case 6: bot.setControlState('right', true); break;
        case 7: 
          bot.setControlState('right', false);
          bot.setControlState('jump', true);
          setTimeout(() => bot.setControlState('jump', false), 200);
          break;
      }
      
      // A cada minuto, envia mensagem para o console
      if (movementCounter % 30 === 0 && socket) {
        socket.emit('bot:message', { 
          source: 'Anti-AFK',
          message: 'Realizando movimento para evitar AFK...',
          type: 'info'
        });
      }
    } catch (err) {
      console.error('Erro no Anti-AFK:', err);
    }
  }, 10000); // A cada 10 segundos
}

// Função para parar Anti-AFK
function stopAntiAfk() {
  if (!antiAfkEnabled) return;
  
  antiAfkEnabled = false;
  clearInterval(antiAfkInterval);
  
  // Resetar todos os estados de controle
  if (bot && bot.entity) {
    try {
      bot.setControlState('forward', false);
      bot.setControlState('back', false);
      bot.setControlState('left', false);
      bot.setControlState('right', false);
      bot.setControlState('jump', false);
    } catch (err) {
      console.error('Erro ao resetar controles:', err);
    }
  }
}

// Manipular sinais de término
process.on('SIGINT', () => {
  console.log('Encerrando bot e servidor...');
  if (bot) {
    stopAntiAfk();
    bot.quit();
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Rotas API
app.get('/api/status', (req, res) => {
  const status = {
    online: bot && bot.entity ? true : false,
    username: bot ? bot.username : null,
    health: bot && bot.entity ? bot.health : null,
    position: bot && bot.entity ? {
      x: Math.floor(bot.entity.position.x),
      y: Math.floor(bot.entity.position.y),
      z: Math.floor(bot.entity.position.z)
    } : null,
    server: botOptions.host || defaultConfig.host,
    reconnectAttempts: reconnectAttempts,
    players: bot ? Object.keys(bot.players).length : 0
  };
  
  res.json(status);
});

// Iniciar o servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado em http://0.0.0.0:${PORT}`);
});
