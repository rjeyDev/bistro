import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('images')
export class Image extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  originalName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;
}
