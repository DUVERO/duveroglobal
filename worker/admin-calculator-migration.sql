-- Apply in Cloudflare D1 DUVERO_DB before deploying the updated Worker.
CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,email TEXT DEFAULT '',categories TEXT NOT NULL DEFAULT '[]',active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS charge_definitions (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,basis TEXT NOT NULL DEFAULT 'flat',section TEXT NOT NULL DEFAULT 'Origin',active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS calculation_settings (name TEXT PRIMARY KEY,value REAL NOT NULL);
INSERT OR IGNORE INTO calculation_settings(name,value) VALUES ('air',166.6666667),('road',333.3333333),('rail',333.3333333),('sea',1000);
INSERT OR IGNORE INTO charge_definitions(name,basis,section) VALUES ('Collection','flat','Origin'),('Origin terminal','gross','Origin'),('Air freight','cw','Origin'),('THC','gross','Destination'),('Customs clearance','flat','Destination'),('Delivery','flat','Destination');
ALTER TABLE enquiries ADD COLUMN calculation_data TEXT NOT NULL DEFAULT '{}';
