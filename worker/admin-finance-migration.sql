-- Apply AFTER admin-schema.sql. Safe for a fresh installation; run only once.
ALTER TABLE enquiries ADD COLUMN cost_lines TEXT NOT NULL DEFAULT '[]';
ALTER TABLE enquiries ADD COLUMN invoice_lines TEXT NOT NULL DEFAULT '[]';
ALTER TABLE enquiries ADD COLUMN shipment_actual TEXT NOT NULL DEFAULT '{}';
ALTER TABLE enquiries ADD COLUMN price_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE enquiries ADD COLUMN price_revision_reason TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS quotation_revisions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 enquiry_id INTEGER NOT NULL,
 revision_number INTEGER NOT NULL,
 snapshot TEXT NOT NULL,
 reason TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(enquiry_id) REFERENCES enquiries(id)
);
CREATE INDEX IF NOT EXISTS idx_quotation_revisions_enquiry ON quotation_revisions(enquiry_id,revision_number);
