import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ImagesModule } from './images/images.module';
import { PrintersModule } from './printers/printers.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'baytown',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // Disabled to prevent schema sync issues
      logging: process.env.NODE_ENV === 'development',
    }),
    ProductsModule,
    OrdersModule,
    ImagesModule,
    PrintersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}