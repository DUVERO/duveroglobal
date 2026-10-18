-- Run once in Cloudflare D1 duvero-db Console before deploying address-book Worker.
CREATE TABLE IF NOT EXISTS address_book (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 kind TEXT NOT NULL CHECK(kind IN ('supplier','customer')),
 company TEXT NOT NULL COLLATE NOCASE,
 address TEXT NOT NULL DEFAULT '',
 country TEXT NOT NULL DEFAULT '',
 city TEXT NOT NULL DEFAULT '',
 postcode TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL DEFAULT '',
 email TEXT NOT NULL DEFAULT '',
 contact TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(kind,company)
);
CREATE INDEX IF NOT EXISTS idx_address_book_kind ON address_book(kind,company);
