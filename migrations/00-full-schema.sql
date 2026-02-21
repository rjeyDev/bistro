-- Full schema for BayTown backend (run this on an empty database to create all tables).
-- Use this on Windows (or any new DB) to match the schema from your Mac.

-- Enums for orders
DO $$ BEGIN
  CREATE TYPE order_status_enum AS ENUM ('Pending', 'Accepted', 'Cancelled', 'Completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE order_type_enum AS ENUM ('DineIn', 'Takeaway', 'Delivery');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "nameTm" VARCHAR(100) NOT NULL,
  "nameRu" VARCHAR(100) NOT NULL,
  "nameEn" VARCHAR(100) NOT NULL UNIQUE,
  "description" VARCHAR(255),
  "imageUrl" VARCHAR(500),
  "sortOrder" INT NOT NULL DEFAULT 0,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "nameTm" VARCHAR(255) NOT NULL,
  "nameRu" VARCHAR(255) NOT NULL,
  "nameEn" VARCHAR(255) NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "categoryId" INT NOT NULL REFERENCES categories(id),
  "imageUrl" VARCHAR(500),
  "sortOrder" INT NOT NULL DEFAULT 0,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP
);

-- Modificators
CREATE TABLE IF NOT EXISTS modificators (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "nameTm" VARCHAR(255) NOT NULL,
  "nameRu" VARCHAR(255) NOT NULL,
  "nameEn" VARCHAR(255) NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "deletedAt" TIMESTAMP
);

-- Product <-> Modificator many-to-many
CREATE TABLE IF NOT EXISTS product_modificators (
  "productId" INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "modificatorId" INT NOT NULL REFERENCES modificators(id) ON DELETE CASCADE,
  PRIMARY KEY ("productId", "modificatorId")
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "orderNumber" INT,
  "status" order_status_enum NOT NULL DEFAULT 'Pending',
  "type" order_type_enum NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "deliveryPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentMethod" VARCHAR(50) NOT NULL,
  "device" VARCHAR(50),
  "notes" TEXT,
  "printerId" INT
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "quantity" INT NOT NULL,
  "options" JSONB,
  "price" DECIMAL(10,2) NOT NULL,
  "orderId" INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "productId" INT NOT NULL REFERENCES products(id)
);

-- Order item modificators (snapshot at order time)
CREATE TABLE IF NOT EXISTS order_item_modificators (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "orderItemId" INT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  "nameTm" VARCHAR(255) NOT NULL,
  "nameRu" VARCHAR(255) NOT NULL,
  "nameEn" VARCHAR(255) NOT NULL,
  "price" DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_item_modificators_order_item_id ON order_item_modificators("orderItemId");

-- Images (uploads)
CREATE TABLE IF NOT EXISTS images (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "filename" VARCHAR(255) NOT NULL,
  "originalName" VARCHAR(255),
  "mimeType" VARCHAR(100)
);

-- Printers
CREATE TABLE IF NOT EXISTS printers (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "name" VARCHAR(255) NOT NULL,
  "ip" VARCHAR(45) NOT NULL,
  "isKitchen" BOOLEAN NOT NULL DEFAULT false
);
