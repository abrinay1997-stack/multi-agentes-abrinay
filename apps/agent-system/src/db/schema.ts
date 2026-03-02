import type Database from 'better-sqlite3'

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS squad_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      output_type TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS content_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      fecha DATE NOT NULL,
      plataforma TEXT NOT NULL CHECK(plataforma IN ('TikTok','Instagram','YouTube')),
      formato TEXT NOT NULL,
      titulo TEXT NOT NULL,
      hook TEXT NOT NULL,
      score_general INTEGER,
      score_hook INTEGER,
      score_ctr REAL,
      hashtags TEXT,
      audio_sugerido TEXT,
      status TEXT NOT NULL CHECK(status IN ('aprobado','descartado')),
      razon_descarte TEXT,
      licencia_p INTEGER DEFAULT 1 CHECK(licencia_p IN (0,1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS error_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      error_type TEXT NOT NULL,
      error_detail TEXT NOT NULL,
      fallback_used TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS run_lock (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      run_id TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_configs (
      agent_name        TEXT PRIMARY KEY,
      system_prompt     TEXT,
      tavily_queries    TEXT,
      rules_always      TEXT,
      rules_never       TEXT,
      memory_notes      TEXT,
      abrinay_profile   TEXT,
      max_retries       INTEGER DEFAULT 1,
      score_threshold   REAL DEFAULT 8.0,
      temperature       REAL DEFAULT 0.7,
      updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Índices de rendimiento — creados una sola vez (IF NOT EXISTS es idempotente)
    -- squad_outputs: getLatestRunOutputs y getAgentOutputs filtran por run_id
    CREATE INDEX IF NOT EXISTS idx_squad_outputs_run_id
      ON squad_outputs(run_id);

    -- content_history: calibración QA hace WHERE plataforma = ? AND status = 'aprobado'
    -- El índice compuesto cubre ambas columnas del WHERE y evita table scan
    CREATE INDEX IF NOT EXISTS idx_content_history_plataforma_status
      ON content_history(plataforma, status);
  `)
}
