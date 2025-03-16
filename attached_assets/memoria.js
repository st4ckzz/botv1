const sqlite3 = require('sqlite3').verbose();  
const db = new sqlite3.Database('memoria.db');  

module.exports = {  
  initMemory: function(bot) {  
    db.run(`CREATE TABLE IF NOT EXISTS historico (  
      id INTEGER PRIMARY KEY,  
      comando TEXT,  
      resposta TEXT,  
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP  
    )`);  

    bot.on('killed', () => {  
      db.run(`INSERT INTO historico (comando, resposta) VALUES ('morte', 'FUI HUMILHADO POR UM NOOB')`);  
    });  
  }  
};  