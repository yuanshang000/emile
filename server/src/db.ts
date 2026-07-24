import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'manyme.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb(): void {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS match_rules (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      field TEXT NOT NULL CHECK(field IN ('sender','subject','body_html','body_text')),
      operator TEXT NOT NULL CHECK(operator IN ('contains','equals','regex','starts_with','ends_with')),
      pattern TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS extract_rules (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      field_name TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'html' CHECK(source IN ('html','text')),
      pattern TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS response_templates (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      template TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      message_id TEXT,
      from_addr TEXT NOT NULL,
      to_addr TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      body_text TEXT DEFAULT '',
      body_html TEXT DEFAULT '',
      group_id TEXT REFERENCES groups(id),
      extracted_data TEXT DEFAULT '{}',
      response_cache TEXT DEFAULT '{}',
      received_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_emails_group ON emails(group_id);
    CREATE INDEX IF NOT EXISTS idx_emails_from ON emails(from_addr);
    CREATE INDEX IF NOT EXISTS idx_emails_received ON emails(received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_groups_priority ON groups(priority DESC);

    CREATE TABLE IF NOT EXISTS email_lib_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_lib_entries (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES email_lib_categories(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_lib_state (
      category_id TEXT PRIMARY KEY REFERENCES email_lib_categories(id) ON DELETE CASCADE,
      current_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_email_lib_entries_category ON email_lib_entries(category_id, sort_order);
  `);
}
