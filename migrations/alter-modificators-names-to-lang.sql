-- Run this ONLY if you already have modificators/order_item_modificators with a single "name" column.
-- Migrates to nameEn, nameRu, nameTm.

-- Modificators: add new columns, copy name into all three, drop name
ALTER TABLE modificators ADD COLUMN IF NOT EXISTS "nameTm" VARCHAR(255);
ALTER TABLE modificators ADD COLUMN IF NOT EXISTS "nameRu" VARCHAR(255);
ALTER TABLE modificators ADD COLUMN IF NOT EXISTS "nameEn" VARCHAR(255);
UPDATE modificators SET "nameTm" = "name", "nameRu" = "name", "nameEn" = "name" WHERE "nameTm" IS NULL;
ALTER TABLE modificators ALTER COLUMN "nameTm" SET NOT NULL;
ALTER TABLE modificators ALTER COLUMN "nameRu" SET NOT NULL;
ALTER TABLE modificators ALTER COLUMN "nameEn" SET NOT NULL;
ALTER TABLE modificators DROP COLUMN IF EXISTS "name";

-- Order item modificators: same
ALTER TABLE order_item_modificators ADD COLUMN IF NOT EXISTS "nameTm" VARCHAR(255);
ALTER TABLE order_item_modificators ADD COLUMN IF NOT EXISTS "nameRu" VARCHAR(255);
ALTER TABLE order_item_modificators ADD COLUMN IF NOT EXISTS "nameEn" VARCHAR(255);
UPDATE order_item_modificators SET "nameTm" = "name", "nameRu" = "name", "nameEn" = "name" WHERE "nameTm" IS NULL;
ALTER TABLE order_item_modificators ALTER COLUMN "nameTm" SET NOT NULL;
ALTER TABLE order_item_modificators ALTER COLUMN "nameRu" SET NOT NULL;
ALTER TABLE order_item_modificators ALTER COLUMN "nameEn" SET NOT NULL;
ALTER TABLE order_item_modificators DROP COLUMN IF EXISTS "name";
