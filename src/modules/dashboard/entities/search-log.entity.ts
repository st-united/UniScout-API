import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('search_log')
export class SearchLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  university: string;

  @CreateDateColumn()
  searched_at: Date;
}
