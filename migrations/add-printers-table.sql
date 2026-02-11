-- Create printers table for printer settings
CREATE TABLE IF NOT EXISTS printers (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "name" VARCHAR(255) NOT NULL,
  "ip" VARCHAR(45) NOT NULL,
  "isKitchen" BOOLEAN NOT NULL DEFAULT false
);
