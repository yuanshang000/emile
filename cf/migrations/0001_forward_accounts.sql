CREATE TABLE IF NOT EXISTS forward_accounts (
  id TEXT PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT '',
  site_url TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT '',
  usage TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_forward_accounts_domain ON forward_accounts(domain);
