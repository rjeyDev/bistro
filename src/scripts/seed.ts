import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Product } from '../products/product.entity';
import { Category } from '../products/category.entity';
import { Modificator } from '../products/modificator.entity';
import { Order } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { OrderItemModificator } from '../orders/order-item-modificator.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { OrderType } from '../orders/enums/order-type.enum';

async function seed() {
  // Create database connection
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'baytown',
    entities: [Product, Category, Modificator, Order, OrderItem, OrderItemModificator],
    synchronize: true,
  });

  try {
    console.log('🔌 Connecting to database...');

    // Try to initialize with synchronization
    try {
      await dataSource.initialize();
      console.log('✅ Connected to database');
    } catch (initError) {
      console.log('⚠️ Schema sync failed, trying alternative connection...');

      // If sync fails, try connecting without sync and drop tables manually
      const altDataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'baytown',
        entities: [Product, Category, Modificator, Order, OrderItem, OrderItemModificator],
        synchronize: false,
      });

      await altDataSource.initialize();
      console.log('✅ Connected to database (without sync)');

      // Drop all tables and let them be recreated
      const queryRunner = altDataSource.createQueryRunner();
      await queryRunner.connect();

      try {
        console.log('🗑️ Dropping existing tables...');

        // Drop tables in reverse dependency order
        await queryRunner.query('DROP TABLE IF EXISTS order_item_modificators CASCADE');
        await queryRunner.query('DROP TABLE IF EXISTS order_items CASCADE');
        await queryRunner.query('DROP TABLE IF EXISTS orders CASCADE');
        await queryRunner.query('DROP TABLE IF EXISTS product_modificators CASCADE');
        await queryRunner.query('DROP TABLE IF EXISTS products CASCADE');
        await queryRunner.query('DROP TABLE IF EXISTS categories CASCADE');
        await queryRunner.query('DROP TABLE IF EXISTS modificators CASCADE');

        console.log('✅ Tables dropped');

        // Also try to drop any sequences that might be associated
        await queryRunner.query('DROP SEQUENCE IF EXISTS categories_id_seq CASCADE');
        await queryRunner.query('DROP SEQUENCE IF EXISTS products_id_seq CASCADE');
        await queryRunner.query('DROP SEQUENCE IF EXISTS modificators_id_seq CASCADE');
        await queryRunner.query('DROP SEQUENCE IF EXISTS orders_id_seq CASCADE');
        await queryRunner.query('DROP SEQUENCE IF EXISTS order_items_id_seq CASCADE');
        await queryRunner.query('DROP SEQUENCE IF EXISTS order_item_modificators_id_seq CASCADE');

      } catch (dropError) {
        console.log('⚠️ Could not drop tables, trying truncate approach...');

        try {
          // If dropping fails, try truncating with CASCADE
          await queryRunner.query('TRUNCATE TABLE order_item_modificators CASCADE');
          await queryRunner.query('TRUNCATE TABLE order_items CASCADE');
          await queryRunner.query('TRUNCATE TABLE orders CASCADE');
          await queryRunner.query('TRUNCATE TABLE product_modificators CASCADE');
          await queryRunner.query('TRUNCATE TABLE products CASCADE');
          await queryRunner.query('TRUNCATE TABLE categories CASCADE');
          await queryRunner.query('TRUNCATE TABLE modificators CASCADE');
          console.log('✅ Tables truncated');
        } catch (truncateError) {
          console.log('⚠️ Truncate also failed, will try individual deletes...');
        }
      } finally {
        await queryRunner.release();
      }

      await altDataSource.destroy();

      // Now try the original connection with sync
      await dataSource.initialize();
      console.log('✅ Database initialized successfully');
    }

    const productRepository = dataSource.getRepository(Product);
    const categoryRepository = dataSource.getRepository(Category);
    const modificatorRepository = dataSource.getRepository(Modificator);
    const orderRepository = dataSource.getRepository(Order);
    const orderItemRepository = dataSource.getRepository(OrderItem);
    const orderItemModificatorRepository = dataSource.getRepository(OrderItemModificator);

    // Final cleanup - try to clear any remaining data
    console.log('🧹 Final cleanup of any remaining data...');
    try {
      await orderItemModificatorRepository.delete({});
      await orderItemRepository.delete({});
      await orderRepository.delete({});
      await dataSource.query('DELETE FROM product_modificators');
      await productRepository.delete({});
      await categoryRepository.delete({});
      await modificatorRepository.delete({});
      console.log('✅ Remaining data cleared');
    } catch (deleteError) {
      console.log('⚠️ Individual deletes failed, data may already be clear');
    }

    console.log('🧹 Database ready for seeding...');

    // Create categories
    console.log('📂 Creating categories...');
    const categoriesData = [
      {
        nameTm: 'Burgerler',
        nameRu: 'Бургеры',
        nameEn: 'Burgers',
        description: 'Delicious burgers with various toppings',
        imageUrl: 'https://example.com/images/category-burgers.jpg',
      },
      {
        nameTm: 'Goşundylar',
        nameRu: 'Гарниры',
        nameEn: 'Sides',
        description: 'Tasty side dishes to complement your meal',
        imageUrl: 'https://example.com/images/category-sides.jpg',
      },
      {
        nameTm: 'İçgiler',
        nameRu: 'Напитки',
        nameEn: 'Beverages',
        description: 'Refreshing drinks and shakes',
        imageUrl: 'https://example.com/images/category-beverages.jpg',
      },
    ];

    // Check if categories already exist, if not create them
    const existingCategories = await categoryRepository.find();
    let categories;

    if (existingCategories.length === 0) {
      categories = await categoryRepository.save(categoriesData);
      console.log(`✅ Created ${categories.length} categories`);
    } else {
      categories = existingCategories;
      console.log(`✅ Using existing ${categories.length} categories`);
    }

    // Create a map for easy category lookup (by nameEn)
    const categoryMap = categories.reduce((map, category) => {
      if (category.nameEn === 'Burgers') map.Burgers = category;
      if (category.nameEn === 'Sides') map.Sides = category;
      if (category.nameEn === 'Beverages') map.Beverages = category;
      return map;
    }, {} as any);

    // Create modificators
    console.log('🧩 Creating modificators...');
    const modificatorsData = [
      { nameTm: 'Goşundy süýji', nameRu: 'Доп. сыр', nameEn: 'Extra cheese', price: 1.5 },
      { nameTm: 'Goýun eti', nameRu: 'Бекон', nameEn: 'Bacon', price: 2.0 },
      { nameTm: 'Uly ölçeg', nameRu: 'Большой размер', nameEn: 'Large size', price: 0.99 },
      { nameTm: 'Goşundy et', nameRu: 'Двойное мясо', nameEn: 'Double meat', price: 3.0 },
    ];
    const existingModificators = await modificatorRepository.find();
    let modificators;
    if (existingModificators.length === 0) {
      modificators = await modificatorRepository.save(modificatorsData);
      console.log(`✅ Created ${modificators.length} modificators`);
    } else {
      modificators = existingModificators;
      console.log(`✅ Using existing ${modificators.length} modificators`);
    }

    // Create 5 dummy products
    console.log('🍔 Creating products...');
    const productsData = [
      {
        nameTm: 'Klassiki burger',
        nameRu: 'Классический бургер',
        nameEn: 'Classic Burger',
        price: 8.99,
        categoryId: categoryMap.Burgers.id,
        imageUrl: 'https://example.com/images/burger.jpg',
        isAvailable: true,
      },
      {
        nameTm: 'Gatyrylan kartoshka',
        nameRu: 'Хрустящий картофель',
        nameEn: 'Crispy Fries',
        price: 3.49,
        categoryId: categoryMap.Sides.id,
        imageUrl: 'https://example.com/images/fries.jpg',
        isAvailable: true,
      },
      {
        nameTm: 'Coca Cola',
        nameRu: 'Кока-Кола',
        nameEn: 'Coca Cola',
        price: 2.49,
        categoryId: categoryMap.Beverages.id,
        imageUrl: 'https://example.com/images/coke.jpg',
        isAvailable: true,
      },
      {
        nameTm: 'Towuk nuggetleri',
        nameRu: 'Куриные наггетсы',
        nameEn: 'Chicken Nuggets',
        price: 5.99,
        categoryId: categoryMap.Sides.id,
        imageUrl: 'https://example.com/images/nuggets.jpg',
        isAvailable: true,
      },
      {
        nameTm: 'Şokolad sheyki',
        nameRu: 'Шоколадный коктейль',
        nameEn: 'Chocolate Shake',
        price: 4.99,
        categoryId: categoryMap.Beverages.id,
        imageUrl: 'https://example.com/images/shake.jpg',
        isAvailable: true,
      },
    ];

    // Check if products already exist, if not create them
    const existingProducts = await productRepository.find();
    let products;

    if (existingProducts.length === 0) {
      products = await productRepository.save(productsData);
      console.log(`✅ Created ${products.length} products`);
      // Attach modificators to Classic Burger (first product)
      const classicBurger = products[0];
      classicBurger.modificators = [modificators[0], modificators[1], modificators[2]]; // Extra cheese, Bacon, Large size
      await productRepository.save(classicBurger);
      // Attach to Chicken Nuggets
      const nuggets = products[3];
      nuggets.modificators = [modificators[2], modificators[3]]; // Large size, Double meat
      await productRepository.save(nuggets);
    } else {
      products = existingProducts;
      console.log(`✅ Using existing ${products.length} products`);
    }

    // Create 2 orders
    console.log('📦 Creating orders...');

    // Check if orders already exist
    const existingOrders = await orderRepository.find();
    if (existingOrders.length > 0) {
      console.log(`✅ Using existing ${existingOrders.length} orders`);
    } else {
    // Note: Order numbers reset daily at noon (12:00 PM)
    // Orders before noon: 00000001, 00000002, etc.
    // Orders after noon: reset to 00000001, 00000002, etc.
    //
    // Print check is automatically generated when orders are accepted

      // Order 1: Pending (from tablet - will trigger socket event)
      const order1 = orderRepository.create({
        orderNumber: 1,
        status: OrderStatus.PENDING,
        type: OrderType.DINE_IN,
        totalAmount: 14.97,
        paymentMethod: 'Cash',
        device: 'tablet',
      });
      const savedOrder1 = await orderRepository.save(order1);

      const order1Items = [
        orderItemRepository.create({
          orderId: savedOrder1.id,
          productId: products[0].id, // Classic Burger
          quantity: 1,
          price: products[0].price,
          options: { size: 'Regular', extras: ['Cheese', 'Lettuce'] },
        }),
        orderItemRepository.create({
          orderId: savedOrder1.id,
          productId: products[1].id, // Crispy Fries
          quantity: 2,
          price: products[1].price,
          options: null,
        }),
      ];
      await orderItemRepository.save(order1Items);
      console.log(`✅ Created order ${order1.orderNumber} (${order1.status})`);

      // Order 2: Accepted (from desktop - won't trigger socket event, but will print check)
      const order2 = orderRepository.create({
        orderNumber: 2,
        status: OrderStatus.ACCEPTED,
        type: OrderType.TAKEAWAY,
        totalAmount: 22.46,
        paymentMethod: 'Credit Card',
        device: 'desktop',
      });
      const savedOrder2 = await orderRepository.save(order2);

    const order2Items = [
      orderItemRepository.create({
        orderId: savedOrder2.id,
        productId: products[0].id, // Classic Burger
        quantity: 2,
        price: products[0].price,
        options: { size: 'Large', extras: ['Bacon', 'Extra Cheese'] },
      }),
      orderItemRepository.create({
        orderId: savedOrder2.id,
        productId: products[2].id, // Coca Cola
        quantity: 2,
        price: products[2].price,
        options: { size: 'Large' },
      }),
    ];
      await orderItemRepository.save(order2Items);
      console.log(`✅ Created order ${order2.orderNumber} (${order2.status})`);
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the seed function
seed();

