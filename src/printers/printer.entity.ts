import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('printers')
export class Printer extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 45 })
  ip: string;

  @Column({ type: 'boolean', default: false })
  isKitchen: boolean;
}
