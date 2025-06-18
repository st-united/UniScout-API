import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('tracking')
@Unique(['country'])
export class TrackingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  country: string;

  @Column({ default: 0 })
  count: number;
}

//Redefine country: University or User
