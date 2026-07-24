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
