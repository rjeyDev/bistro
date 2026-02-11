-- Add soft delete column to modificators
ALTER TABLE modificators ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;
