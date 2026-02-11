-- Add soft delete column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;
