-- Add invoice_number column to billing_events
ALTER TABLE billing_events ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
