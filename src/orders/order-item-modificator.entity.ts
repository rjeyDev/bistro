import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { OrderItem } from './order-item.entity';

@Entity('order_item_modificators')
export class OrderItemModificator extends BaseEntity {
  @Column()
  orderItemId: number;

  @ManyToOne(() => OrderItem, (orderItem) => orderItem.modificators, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderItemId' })
  orderItem: OrderItem;

  @Column({ type: 'varchar', length: 255 })
  nameTm: string;

  @Column({ type: 'varchar', length: 255 })
  nameRu: string;

  @Column({ type: 'varchar', length: 255 })
  nameEn: string;

  @Column({ type: 'double precision' })
  price: number;
}
