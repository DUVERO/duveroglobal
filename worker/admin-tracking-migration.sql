-- Run each ALTER statement once in the existing DUVERO D1 Console.
ALTER TABLE enquiries ADD COLUMN followup_date TEXT NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN internal_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_enquiries_company ON enquiries(company);
CREATE INDEX IF NOT EXISTS idx_enquiries_followup ON enquiries(followup_date);
CREATE INDEX IF NOT EXISTS idx_enquiries_archived ON enquiries(archived);
