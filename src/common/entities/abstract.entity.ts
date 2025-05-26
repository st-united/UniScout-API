import { Column, CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

export abstract class AbstractEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @CreateDateColumn({
    type: 'timestamp',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  @Exclude()
  createdAt: Date;

  @Column({ type: 'bigint', nullable: true })
  @Exclude()
  createdBy: number;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  @Exclude()
  updatedAt: Date;

  @Column({ type: 'bigint', nullable: true })
  @Exclude()
  updatedBy: number;

  @DeleteDateColumn({
    type: 'timestamp',
    nullable: true,
  })
  @Exclude()
  deletedAt: Date;

  @Column({ type: 'bigint', nullable: true })
  @Exclude()
  deletedBy: number;
}
