import { Entity, Column, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('modificators')
export class Modificator extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  nameTm: string;

  @Column({ type: 'varchar', length: 255 })
  nameRu: string;

  @Column({ type: 'varchar', length: 255 })
  nameEn: string;

  @Column({ type: 'double precision' })
  price: number;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
