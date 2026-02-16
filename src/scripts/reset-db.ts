import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Product } from '../products/product.entity';
import { Category } from '../products/category.entity';
import { Modificator } from '../products/modificator.entity';
import { Order } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { OrderItemModificator } from '../orders/order-item-modificator.entity';
import { Image } from '../images/image.entity';

async function resetDatabase() {
  console.log('🔄 Resetting database schema...');

  // Create database connection without sync
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'baytown',
    entities: [Product, Category, Modificator, Order, OrderItem, OrderItemModificator, Image],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      console.log('🗑️ Dropping existing tables...');

      // Drop tables in reverse dependency order with CASCADE
      await queryRunner.query('DROP TABLE IF EXISTS order_item_modificators CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS order_items CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS orders CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS product_modificators CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS products CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS categories CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS modificators CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS images CASCADE');

      // Drop sequences
      await queryRunner.query('DROP SEQUENCE IF EXISTS categories_id_seq CASCADE');
      await queryRunner.query('DROP SEQUENCE IF EXISTS products_id_seq CASCADE');
      await queryRunner.query('DROP SEQUENCE IF EXISTS modificators_id_seq CASCADE');
      await queryRunner.query('DROP SEQUENCE IF EXISTS orders_id_seq CASCADE');
      await queryRunner.query('DROP SEQUENCE IF EXISTS order_items_id_seq CASCADE');
      await queryRunner.query('DROP SEQUENCE IF EXISTS order_item_modificators_id_seq CASCADE');
      await queryRunner.query('DROP SEQUENCE IF EXISTS images_id_seq CASCADE');

      console.log('✅ All tables and sequences dropped');

      // Now synchronize to create fresh schema
      console.log('🔄 Creating fresh schema...');
      await dataSource.synchronize();
      console.log('✅ Fresh schema created');

    } catch (error) {
      console.error('❌ Error during reset:', error);
      process.exit(1);
    } finally {
      await queryRunner.release();
    }

  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }

  console.log('🎉 Database reset complete!');
}

// Run the reset function
resetDatabase();

