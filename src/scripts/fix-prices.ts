import { DataSource, IsNull } from 'typeorm';
import { Product } from '../products/product.entity';
import { Category } from '../products/category.entity';
import { getAnyName } from '../common/lang';

async function fixPrices() {
  // Create database connection
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'baytown',
    entities: [Product, Category],
    synchronize: false, // Don't sync schema, just connect
  });

  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const productRepository = dataSource.getRepository(Product);

    // Find products with null prices
    const productsWithNullPrices = await productRepository.find({
      where: { price: IsNull() },
    });

    if (productsWithNullPrices.length === 0) {
      console.log('✅ No products with null prices found');
    } else {
      console.log(`🔧 Found ${productsWithNullPrices.length} products with null prices`);

      // Set default price of 0.00 for products with null prices
      for (const product of productsWithNullPrices) {
        product.price = 0.00;
        console.log(`  - Setting price for "${getAnyName(product)}" to $0.00`);
      }

      await productRepository.save(productsWithNullPrices);
      console.log('✅ Fixed null prices');
    }

  } catch (error) {
    console.error('❌ Error fixing prices:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix function
fixPrices();
