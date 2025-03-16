/**
 * Q-Learning - Módulo de machine learning básico
 * Implementa algoritmo Q-Learning para tomada de decisão do bot
 */

module.exports = {
  qLearning: function(bot) {
    // Tabela Q para armazenar valores de estado-ação
    const qTable = {};
    
    // Parâmetros de aprendizado
    const learningRate = 0.1;
    const discountFactor = 0.9;
    const explorationRate = 0.2; // Probabilidade de explorar novas ações
    
    // Registrar estados possíveis
    const estados = {
      COMBATE: 'combate',
      MINERACAO: 'mineracao',
      EXPLORACAO: 'exploracao',
      PERIGO: 'perigo',
      OCIOSO: 'ocioso'
    };
    
    // Registrar ações possíveis
    const acoes = {
      ATACAR: 'atacar',
      FUGIR: 'fugir',
      MINERAR: 'minerar',
      COLETAR: 'coletar',
      SEGUIR: 'seguir',
      ESCONDER: 'esconder'
    };
    
    // Inicializar a tabela Q com valores padrão
    function initQTable() {
      qTable[estados.COMBATE] = { 
        [acoes.ATACAR]: 0, 
        [acoes.FUGIR]: 5,
        [acoes.ESCONDER]: 2
      };
      
      qTable[estados.MINERACAO] = { 
        [acoes.MINERAR]: 10, 
        [acoes.COLETAR]: 5,
        [acoes.FUGIR]: 0
      };
      
      qTable[estados.EXPLORACAO] = { 
        [acoes.SEGUIR]: 5, 
        [acoes.COLETAR]: 7,
        [acoes.MINERAR]: 3
      };
      
      qTable[estados.PERIGO] = { 
        [acoes.FUGIR]: 10, 
        [acoes.ESCONDER]: 8,
        [acoes.ATACAR]: 2
      };
      
      qTable[estados.OCIOSO] = { 
        [acoes.SEGUIR]: 5, 
        [acoes.MINERAR]: 7,
        [acoes.COLETAR]: 3,
        [acoes.ESCONDER]: 1
      };
    }
    
    // Função para escolher ação baseada no estado atual
    function escolherAcao(estado) {
      // Inicializar estado se não existir
      if (!qTable[estado]) {
        qTable[estado] = {};
        Object.values(acoes).forEach(acao => {
          qTable[estado][acao] = Math.random() * 5; // Valores iniciais aleatórios
        });
      }
      
      // Exploração: escolher ação aleatória
      if (Math.random() < explorationRate) {
        const acoesDisponiveis = Object.keys(qTable[estado]);
        return acoesDisponiveis[Math.floor(Math.random() * acoesDisponiveis.length)];
      }
      
      // Exploração: escolher a melhor ação
      return Object.keys(qTable[estado])
        .sort((a, b) => qTable[estado][b] - qTable[estado][a])[0];
    }
    
    // Função para atualizar o valor Q
    function atualizarQ(estado, acao, recompensa, novoEstado) {
      // Garantir que o estado existe
      if (!qTable[estado]) {
        qTable[estado] = {};
        Object.values(acoes).forEach(a => {
          qTable[estado][a] = Math.random() * 5;
        });
      }
      
      // Garantir que a ação existe no estado
      if (!qTable[estado][acao]) {
        qTable[estado][acao] = Math.random() * 5;
      }
      
      // Garantir que o novo estado existe
      if (novoEstado && !qTable[novoEstado]) {
        qTable[novoEstado] = {};
        Object.values(acoes).forEach(a => {
          qTable[novoEstado][a] = Math.random() * 5;
        });
      }
      
      // Calcular o melhor valor Q do próximo estado
      let maxNextQ = 0;
      if (novoEstado) {
        maxNextQ = Math.max(...Object.values(qTable[novoEstado]));
      }
      
      // Atualizar o valor Q usando a fórmula Q-Learning
      const oldValue = qTable[estado][acao];
      const newValue = oldValue + learningRate * (recompensa + discountFactor * maxNextQ - oldValue);
      
      qTable[estado][acao] = newValue;
      
      // Registrar o aprendizado
      console.log(`Q-Learning: ${estado}/${acao} => ${oldValue.toFixed(2)} -> ${newValue.toFixed(2)}`);
      
      return newValue;
    }
    
    // Detectar estado atual baseado no ambiente
    function detectarEstado() {
      try {
        // Verificar entidades hostis próximas
        const entidadesHostis = bot.entities;
        let entidadeHostil = null;
        
        if (entidadesHostis) {
          entidadeHostil = Object.values(entidadesHostis).find(e => 
            e.type === 'mob' && 
            e.position.distanceTo(bot.entity.position) < 16 &&
            ['zombie', 'skeleton', 'creeper', 'spider'].includes(e.name)
          );
        }
        
        // Verificar saúde do bot
        const saudePerigosa = bot.health < 10;
        
        // Verificar jogadores próximos
        const jogadoresProximos = Object.values(bot.players)
          .filter(p => p.entity && p.entity.position.distanceTo(bot.entity.position) < 10)
          .length > 0;
          
        // Determinar estado baseado nas condições
        if (entidadeHostil || saudePerigosa) {
          return estados.PERIGO;
        } else if (jogadoresProximos) {
          return estados.COMBATE;
        } else if (bot.targetDigBlock) {
          return estados.MINERACAO;
        } else if (Object.values(bot.entities).some(e => 
          e.type === 'object' && 
          e.position.distanceTo(bot.entity.position) < 10 && 
          ['item', 'experience_orb'].includes(e.name))
        ) {
          return estados.EXPLORACAO;
        } else {
          return estados.OCIOSO;
        }
      } catch (err) {
        console.error('Erro ao detectar estado:', err);
        return estados.OCIOSO; // Estado padrão em caso de erro
      }
    }
    
    // Inicializar tabela Q
    initQTable();
    
    // Configurar eventos para aprendizado
    
    // Evento de dano recebido
    bot.on('hurt', () => {
      const estado = estados.PERIGO;
      const acao = acoes.FUGIR;
      const recompensa = -10; // Recompensa negativa por tomar dano
      
      atualizarQ(estado, acao, recompensa, detectarEstado());
      
      // Se saúde estiver baixa, reagir
      if (bot.health < 7) {
        bot.chat("TÔ TOMANDO PORRADA! VOU VAZAR!");
      }
    });
    
    // Evento de coleta de item
    bot.on('playerCollect', (collector, collected) => {
      if (collector.username === bot.username) {
        const estado = estados.EXPLORACAO;
        const acao = acoes.COLETAR;
        const recompensa = 5; // Recompensa positiva por coletar item
        
        atualizarQ(estado, acao, recompensa, detectarEstado());
      }
    });
    
    // Evento de finalização de mineração
    bot.on('diggingCompleted', () => {
      const estado = estados.MINERACAO;
      const acao = acoes.MINERAR;
      const recompensa = 8; // Recompensa positiva por minerar com sucesso
      
      atualizarQ(estado, acao, recompensa, detectarEstado());
    });
    
    // Evento de morte (grande penalidade)
    bot.on('death', () => {
      const estadoAtual = detectarEstado();
      const acoesDoEstado = Object.keys(qTable[estadoAtual] || {});
      
      // Penalizar todas as ações do estado atual
      acoesDoEstado.forEach(acao => {
        atualizarQ(estadoAtual, acao, -20, estados.OCIOSO);
      });
      
      bot.chat("MORRI! QUE MERDA! VOU APRENDER COM ISSO!");
    });
    
    // Monitorar ambiente periodicamente
    setInterval(() => {
      try {
        const estadoAtual = detectarEstado();
        const melhorAcao = escolherAcao(estadoAtual);
        
        // Registrar decisão no log
        console.log(`Q-Learning decisão: ${estadoAtual} -> ${melhorAcao}`);
        
        // Recompensar ação de acordo com o estado
        if (estadoAtual === estados.OCIOSO) {
          atualizarQ(estadoAtual, melhorAcao, 1, estadoAtual); // Pequena recompensa por estar ocioso
        }
      } catch (err) {
        console.error('Erro no monitoramento de ambiente:', err);
      }
    }, 10000); // A cada 10 segundos
    
    // Adicionar métodos Q-Learning ao bot
    bot.decidirAcao = (estado) => escolherAcao(estado || detectarEstado());
    bot.detectarEstado = detectarEstado;
    bot.atualizarQ = atualizarQ;
    bot.getQTable = () => qTable;
    
    // Exportar constantes
    bot.estados = estados;
    bot.acoes = acoes;
    
    console.log('Módulo Q-Learning inicializado');
  }
};
