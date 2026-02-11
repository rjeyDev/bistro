-- Run this migration to add modificators support.
-- Tables: modificators, product_modificators (join), order_item_modificators.

-- Modificators (nameEn, nameRu, nameTm + price)
CREATE TABLE IF NOT EXISTS modificators (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "nameTm" VARCHAR(255) NOT NULL,
  "nameRu" VARCHAR(255) NOT NULL,
  "nameEn" VARCHAR(255) NOT NULL,
  "price" DOUBLE PRECISION NOT NULL
);

-- Product <-> Modificator many-to-many
CREATE TABLE IF NOT EXISTS product_modificators (
  "productId" INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "modificatorId" INTEGER NOT NULL REFERENCES modificators(id) ON DELETE CASCADE,
  PRIMARY KEY ("productId", "modificatorId")
);

-- Order item selected modificators (snapshot: nameEn, nameRu, nameTm + price at order time)
CREATE TABLE IF NOT EXISTS order_item_modificators (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "orderItemId" INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  "nameTm" VARCHAR(255) NOT NULL,
  "nameRu" VARCHAR(255) NOT NULL,
  "nameEn" VARCHAR(255) NOT NULL,
  "price" DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_item_modificators_order_item_id
  ON order_item_modificators("orderItemId");
