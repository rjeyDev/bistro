-- Order number (table number) is only used for DineIn; Delivery and Takeaway have null
ALTER TABLE orders ALTER COLUMN "orderNumber" DROP NOT NULL;
