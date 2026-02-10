-- Add phone column to agents table for human participants
ALTER TABLE agents ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update Nathanael with his phone number (if known)
-- UPDATE agents SET phone = '+49...' WHERE name = 'Nathanael';
