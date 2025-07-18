import { Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('tracking')
export class TrackingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  accessed_at: Date;
}
