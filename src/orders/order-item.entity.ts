import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Order } from './order.entity';
import { Product } from '../products/product.entity';
import { OrderItemModificator } from './order-item-modificator.entity';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'jsonb', nullable: true })
  options: Record<string, any> | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: number;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: number;

  @OneToMany(() => OrderItemModificator, (m) => m.orderItem, { eager: true })
  modificators: OrderItemModificator[];
}

