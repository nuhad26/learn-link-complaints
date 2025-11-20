-- Update complaint category enum with new values
-- First, we need to alter the existing enum type

-- Add new enum values
ALTER TYPE complaint_category ADD VALUE IF NOT EXISTS 'mentor';
ALTER TYPE complaint_category ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE complaint_category ADD VALUE IF NOT EXISTS 'academic_counsellor';
ALTER TYPE complaint_category ADD VALUE IF NOT EXISTS 'working_hub';
ALTER TYPE complaint_category ADD VALUE IF NOT EXISTS 'peer';
ALTER TYPE complaint_category ADD VALUE IF NOT EXISTS 'other';

-- Note: PostgreSQL doesn't support removing enum values directly
-- Old values (academic, hostel, transport, finance, disciplinary, others) will remain available
-- but we'll only show the new values in the UI