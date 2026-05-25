const Database = require('better-sqlite3');
const db = new Database('albion_events.db', { verbose: console.log });

// Criar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS event_participants (
    event_id INTEGER,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL, -- DPS, Healer, Tank, Support
    joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
  );
`);

module.exports = db;