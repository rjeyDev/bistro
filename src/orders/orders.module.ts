import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderItemModificator } from './order-item-modificator.entity';
import { Product } from '../products/product.entity';
import { Modificator } from '../products/modificator.entity';
import { PrintersModule } from '../printers/printers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderItemModificator,
      Product,
      Modificator,
    ]),
    PrintersModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway],
  exports: [OrdersService],
})
export class OrdersModule {}

