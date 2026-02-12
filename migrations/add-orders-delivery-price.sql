-- Add delivery price to orders (for Delivery type)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveryPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
