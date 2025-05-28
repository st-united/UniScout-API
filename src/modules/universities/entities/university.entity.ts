import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class University {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  foundedYear?: number;

  @Column({ nullable: true })
  website?: string;
}
