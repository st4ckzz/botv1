/**
 * Módulo Skin Cloner - Para detectar e usar plugins de skin nos servidores
 * Baseado na função 4 do bot
 */

// Lista de comandos para plugins de skin conhecidos
const PLUGINS = {
  'SkinsRestorer': (nome) => `/skin set ${nome}`,
  'ChangeSkin': (nome) => `/changeskin set ${nome}`,
  'SkinSystem': (nome) => `/setskin ${nome}`,
  'CustomSkinLoader': (nome) => `/skin ${nome}`,
  'SkinsPlugin': (nome) => `/skin ${nome}`
};

module.exports = function(bot) {
  // Estado
  let skinAtual = null;
  let pluginsDetectados = {};
  
  /**
   * Detectar plugins de skin no servidor
   * @returns {Promise<string[]>} - Lista de plugins detectados
   */
  function detectarPluginsSkin() {
    return new Promise((resolve) => {
      bot.chat('/plugins');
      
      // Criar listener temporário para capturar a resposta
      const pluginsListener = (msg) => {
        const resposta = msg.toString().toLowerCase();
        const detectados = [];
        
        Object.keys(PLUGINS).forEach(plugin => {
          if (resposta.includes(plugin.toLowerCase())) {
            detectados.push(plugin);
            pluginsDetectados[plugin] = true;
          }
        });
        
        // Remover o listener após processamento
        bot.removeListener('message', pluginsListener);
        resolve(detectados);
      };
      
      // Adicionar o listener temporário
      bot.once('message', pluginsListener);
      
      // Timeout para caso não receba resposta
      setTimeout(() => {
        bot.removeListener('message', pluginsListener);
        resolve([]);
      }, 5000);
    });
  }
  
  /**
   * Aplicar skin usando o plugin detectado
   * @param {string} nomeSkin - Nome da skin para aplicar
   * @returns {Promise<boolean>} - Se conseguiu aplicar
   */
  async function aplicarSkin(nomeSkin) {
    try {
      if (!Object.keys(pluginsDetectados).length) {
        await detectarPluginsSkin();
      }
      
      const pluginsDisponiveis = Object.keys(pluginsDetectados);
      
      if (pluginsDisponiveis.length === 0) {
        console.log('Nenhum plugin de skin encontrado no servidor.');
        return false;
      }
      
      // Usar o primeiro plugin disponível
      const plugin = pluginsDisponiveis[0];
      const comando = PLUGINS[plugin](nomeSkin);
      
      bot.chat(comando);
      skinAtual = nomeSkin;
      
      console.log(`Skin aplicada: ${nomeSkin} através do plugin ${plugin}`);
      return true;
    } catch (err) {
      console.error('Erro ao aplicar skin:', err);
      return false;
    }
  }
  
  /**
   * Obter skin atual
   * @returns {string|null} - Nome da skin atual ou null
   */
  function getSkinAtual() {
    return skinAtual;
  }
  
  /**
   * Obter plugins de skin detectados
   * @returns {string[]} - Lista de plugins detectados
   */
  function getPluginsDetectados() {
    return Object.keys(pluginsDetectados);
  }
  
  // Inicialização: detectar plugins ao entrar no servidor
  bot.once('spawn', () => {
    detectarPluginsSkin().then(plugins => {
      if (plugins.length > 0) {
        console.log(`Plugins de skin detectados: ${plugins.join(', ')}`);
      } else {
        console.log('Nenhum plugin de skin detectado no servidor.');
      }
    });
  });
  
  return {
    detectarPluginsSkin,
    aplicarSkin,
    getSkinAtual,
    getPluginsDetectados
  };
};