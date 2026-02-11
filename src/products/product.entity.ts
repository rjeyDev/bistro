import { Entity, Column, ManyToOne, ManyToMany, JoinColumn, JoinTable, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Category } from './category.entity';
import { Modificator } from './modificator.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  nameTm: string;

  @Column({ type: 'varchar', length: 255 })
  nameRu: string;

  @Column({ type: 'varchar', length: 255 })
  nameEn: string;

  @Column({ type: 'double precision' })
  price: number;

  @ManyToOne(() => Category, (category) => category.products, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column()
  categoryId: number;

  @ManyToMany(() => Modificator, { eager: true })
  @JoinTable({
    name: 'product_modificators',
    joinColumn: { name: 'productId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'modificatorId', referencedColumnName: 'id' },
  })
  modificators: Modificator[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}

