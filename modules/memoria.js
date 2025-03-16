/**
 * Memoria - Sistema de armazenamento de memória para o bot
 * Usa SQLite para persistir informações importantes
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Caminho para o banco de dados
const dbPath = path.join(__dirname, '..', 'memoria.db');

module.exports = {
  initMemory: function(bot) {
    // Criar diretório de dados se não existir
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Inicializar conexão com o banco de dados
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
      }
      console.log('Conexão com banco de dados de memória estabelecida');
    });
    
    // Criar tabelas necessárias
    db.serialize(() => {
      // Tabela de histórico de comandos/eventos
      db.run(`CREATE TABLE IF NOT EXISTS historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        comando TEXT,
        resposta TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Tabela de jugadores conhecidos
      db.run(`CREATE TABLE IF NOT EXISTS jogadores (
        username TEXT PRIMARY KEY,
        comportamento TEXT,
        ultima_interacao DATETIME,
        interacoes INTEGER DEFAULT 0,
        amizade INTEGER DEFAULT 0
      )`);
      
      // Tabela de locais importantes
      db.run(`CREATE TABLE IF NOT EXISTS locais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        x INTEGER,
        y INTEGER,
        z INTEGER,
        dimensao TEXT,
        descricao TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Tabela de estatísticas do bot
      db.run(`CREATE TABLE IF NOT EXISTS estatisticas (
        tipo TEXT PRIMARY KEY,
        valor INTEGER DEFAULT 0,
        ultima_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    });
    
    // Registrar eventos no histórico
    function registrarEvento(tipo, comando, resposta) {
      db.run(`INSERT INTO historico (tipo, comando, resposta) VALUES (?, ?, ?)`, 
        [tipo, comando, resposta], 
        function(err) {
          if (err) console.error('Erro ao registrar evento:', err);
        }
      );
    }
    
    // Registrar ou atualizar jogador
    function registrarJogador(username, comportamento = 'neutro') {
      db.get(`SELECT * FROM jogadores WHERE username = ?`, [username], (err, row) => {
        if (err) {
          console.error('Erro ao verificar jogador:', err);
          return;
        }
        
        if (row) {
          // Atualizar jogador existente
          db.run(`UPDATE jogadores SET 
            ultima_interacao = CURRENT_TIMESTAMP, 
            interacoes = interacoes + 1 
            WHERE username = ?`, 
            [username], 
            function(err) {
              if (err) console.error('Erro ao atualizar jogador:', err);
            }
          );
        } else {
          // Inserir novo jogador
          db.run(`INSERT INTO jogadores (username, comportamento, ultima_interacao, interacoes) 
            VALUES (?, ?, CURRENT_TIMESTAMP, 1)`, 
            [username, comportamento], 
            function(err) {
              if (err) console.error('Erro ao inserir jogador:', err);
              else bot.chat(`PRIMEIRA VEZ QUE TE VEJO, ${username.toUpperCase()}! VOU LEMBRAR DE VOCÊ!`);
            }
          );
        }
      });
    }
    
    // Atualizar estatística
    function atualizarEstatistica(tipo, incremento = 1) {
      db.run(`INSERT INTO estatisticas (tipo, valor, ultima_atualizacao) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(tipo) DO UPDATE SET 
        valor = valor + ?, 
        ultima_atualizacao = CURRENT_TIMESTAMP`, 
        [tipo, incremento, incremento], 
        function(err) {
          if (err) console.error('Erro ao atualizar estatística:', err);
        }
      );
    }
    
    // Registrar local importante
    function registrarLocal(nome, x, y, z, dimensao = 'overworld', descricao = '') {
      db.run(`INSERT INTO locais (nome, x, y, z, dimensao, descricao) 
        VALUES (?, ?, ?, ?, ?, ?)`, 
        [nome, x, y, z, dimensao, descricao], 
        function(err) {
          if (err) console.error('Erro ao registrar local:', err);
          else console.log(`Local registrado: ${nome} em ${x},${y},${z}`);
        }
      );
    }
    
    // Registrar morte do bot
    bot.on('death', () => {
      const pos = bot.entity.position;
      registrarEvento('morte', 'death', 'Bot morreu');
      atualizarEstatistica('mortes');
      registrarLocal('Local da Morte', Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z), bot.game.dimension, 'Local onde o bot morreu');
      bot.chat("MORRI, CARALHO! VOU LEMBRAR DESSE LUGAR PRA NUNCA MAIS VOLTAR!");
    });
    
    // Registrar dano sofrido
    bot.on('hurt', () => {
      registrarEvento('dano', 'hurt', `Saúde atual: ${bot.health}`);
      atualizarEstatistica('danos_sofridos');
    });
    
    // Registrar interações de chat
    bot.on('chat', (username, message) => {
      if (username === bot.username) return;
      
      registrarEvento('chat', message, '');
      registrarJogador(username);
      
      // Determinar comportamento baseado na mensagem
      let comportamento = 'neutro';
      
      if (message.includes('obrigado') || message.includes('bom bot')) {
        comportamento = 'amigavel';
        db.run(`UPDATE jogadores SET amizade = amizade + 1 WHERE username = ?`, [username]);
      } else if (message.includes('idiota') || message.includes('burro') || message.toUpperCase() === message) {
        comportamento = 'hostil';
        db.run(`UPDATE jogadores SET amizade = amizade - 1 WHERE username = ?`, [username]);
      }
      
      // Reconhecer jogadores frequentes
      db.get(`SELECT interacoes, amizade FROM jogadores WHERE username = ?`, [username], (err, row) => {
        if (err || !row) return;
        
        if (row.interacoes % 10 === 0) { // A cada 10 interações
          let mensagem = '';
          
          if (row.amizade > 5) {
            mensagem = `JÁ FALOU COMIGO ${row.interacoes} VEZES, ${username.toUpperCase()}! ATÉ QUE VOCÊ NÃO É TÃO RUIM.`;
          } else if (row.amizade < -5) {
            mensagem = `${row.interacoes} INTERAÇÕES E VOCÊ AINDA ME IRRITA, ${username.toUpperCase()}!`;
          } else {
            mensagem = `CONTANDO ESSA JÁ SÃO ${row.interacoes} VEZES QUE VOCÊ FALA COMIGO, ${username.toUpperCase()}!`;
          }
          
          bot.chat(mensagem);
        }
      });
    });
    
    // Registrar spawn do bot
    bot.once('spawn', () => {
      registrarEvento('conexao', 'spawn', 'Bot conectado ao servidor');
      atualizarEstatistica('conexoes');
      
      // Registrar base como local importante
      const pos = bot.entity.position;
      registrarLocal('Ponto Inicial', Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z), bot.game.dimension, 'Local onde o bot iniciou');
    });
    
    // Adicionar métodos de memória ao bot
    bot.memoria = {
      registrarEvento,
      registrarJogador,
      atualizarEstatistica,
      registrarLocal,
      
      // Métodos para consultar a memória
      obterJogador: function(username, callback) {
        db.get(`SELECT * FROM jogadores WHERE username = ?`, [username], callback);
      },
      
      obterEstatistica: function(tipo, callback) {
        db.get(`SELECT * FROM estatisticas WHERE tipo = ?`, [tipo], callback);
      },
      
      obterLocaisProximos: function(x, y, z, raio = 100, callback) {
        db.all(`SELECT * FROM locais WHERE 
          (x - ?)*(x - ?) + (y - ?)*(y - ?) + (z - ?)*(z - ?) < ?*?`, 
          [x, x, y, y, z, z, raio, raio], callback);
      },
      
      obterHistorico: function(limite = 10, callback) {
        db.all(`SELECT * FROM historico ORDER BY timestamp DESC LIMIT ?`, [limite], callback);
      }
    };
    
    // Configurar fechamento correto do banco ao desconectar
    bot.on('end', () => {
      console.log('Fechando conexão com banco de dados de memória');
      db.close();
    });
    
    console.log('Sistema de memória inicializado');
  }
};
