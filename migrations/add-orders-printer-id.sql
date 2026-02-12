-- Add active printer reference to orders (for receipt printing)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "printerId" INTEGER NULL;
