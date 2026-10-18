-- DUVERO customer identity + contacts. Execute once in D1 before Worker deployment.
CREATE TABLE IF NOT EXISTS customer_companies (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 country TEXT NOT NULL,
 registration_number TEXT NOT NULL,
 company_name TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(country,registration_number)
);
CREATE TABLE IF NOT EXISTS customer_contacts (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 company_id INTEGER NOT NULL REFERENCES customer_companies(id),
 email TEXT NOT NULL COLLATE NOCASE,
 full_name TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(company_id,email)
);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_company ON customer_contacts(company_id);
