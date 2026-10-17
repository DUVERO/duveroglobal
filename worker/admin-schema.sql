-- Run once in Cloudflare D1 database bound to DUVERO_DB.
CREATE TABLE IF NOT EXISTS quote_counters (
  period TEXT PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_number TEXT NOT NULL UNIQUE,
  group_id TEXT,
  service TEXT NOT NULL,
  company TEXT NOT NULL,
  person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  origin TEXT,
  destination TEXT,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'New',
  currency TEXT DEFAULT 'EUR',
  transit TEXT DEFAULT '',
  validity INTEGER DEFAULT 7,
  incoterm TEXT DEFAULT '',
  remarks TEXT DEFAULT '',
  price_lines TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  sent_to TEXT
);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_group ON enquiries(group_id);
