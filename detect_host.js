/**
 * Detect Host - Módulo para identificar servidores gratuitos
 * Detecta Aternos, Server.pro, Minehut e outros hosts gratuitos
 */

const fs = require('fs');
const path = require('path');

// Função para carregar hosts gratuitos conhecidos do arquivo de configuração
function loadFreeHosts() {
  try {
    const hostsFile = path.join(__dirname, 'config', 'hosts_gratis.txt');
    if (fs.existsSync(hostsFile)) {
      const hosts = fs.readFileSync(hostsFile, 'utf8').split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      return hosts;
    }
  } catch (err) {
    console.error('Erro ao carregar lista de hosts gratuitos:', err);
  }
  
  // Lista padrão caso o arquivo não exista
  return ['aternos.me', 'server.pro', 'minehut.gg', 'mcprohosting.com', 'ploudos.com'];
}

// Função para carregar respostas engraçadas
function loadResponses() {
  try {
    const configPath = path.join(__dirname, 'config', 'respostas.json');
    if (fs.existsSync(configPath)) {
      const respostas = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return respostas.host_free || [];
    }
  } catch (err) {
    console.error('Erro ao carregar respostas:', err);
  }
  
  // Respostas padrão caso o arquivo não exista
  return [
    "ATERNOOOOOOS? TÁ POBRE ASSIM, IRMÃO? KKKK",
    "COMPRA UM HOST DE 20 CONTO, MARGINAL!",
    "SERVIDOR GRÁTIS É IGUAL COMER SEM SAL... UMA MERDA!"
  ];
}

// Função principal para detectar host
module.exports = function(bot) {
  const hostsFree = loadFreeHosts();
  const hostResponses = loadResponses();
  
  // Verificar na primeira conexão
  bot.once('spawn', () => {
    try {
      // Obter informação do host
      const host = bot._client.socket._host || '';
      const isFree = hostsFree.some(h => host.toLowerCase().includes(h.toLowerCase()));
      
      if (isFree) {
        // Selecionar resposta aleatória
        const resposta = hostResponses[Math.floor(Math.random() * hostResponses.length)];
        bot.chat(resposta);
        
        // Comentário adicional com delay
        setTimeout(() => {
          bot.chat("O LAG AQUI É MAIOR QUE A PREGUIÇA DE VOCÊS!");
        }, 3000);
        
        // Registrar informação
        console.log(`Detectado servidor gratuito: ${host}`);
        
        // Verificar performance a cada 5 minutos
        setInterval(() => {
          const pingAtual = bot._client.latency || 0;
          if (pingAtual > 500) {
            bot.chat("PING DE " + pingAtual + "ms? ESSE SERVER TÁ RODANDO NUM MICROONDAS!");
          }
        }, 300000); // 5 minutos
      }
    } catch (err) {
      console.error('Erro ao detectar host:', err);
    }
  });
  
  // Adicionar método para verificar host manualmente
  bot.checkServerType = function() {
    try {
      const host = bot._client.socket._host || '';
      const isFree = hostsFree.some(h => host.toLowerCase().includes(h.toLowerCase()));
      return {
        host: host,
        isFree: isFree,
        type: isFree ? 'free' : 'premium'
      };
    } catch (err) {
      console.error('Erro ao verificar tipo de servidor:', err);
      return { host: 'unknown', isFree: false, type: 'unknown' };
    }
  };
};
