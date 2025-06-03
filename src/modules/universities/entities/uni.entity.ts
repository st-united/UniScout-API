import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '@Entity/abstract.entity';

@Entity('uni')
export class UniEntity extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  university: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'text' })
  logo: string;

  @Column({ type: 'int', nullable: true })
  rank: number;

  @Column({ type: 'text' })
  type: string;

  @Column({ type: 'text' })
  country: string;

  @Column({ type: 'text' })
  location: string;

  @Column({ type: 'int' })
  student: number;

  get size(): 'small' | 'medium' | 'large' | 'mega large' | 'unknown' {
    if (this.student === null || this.student === undefined) {
      return 'unknown';
    } else if (this.student < 20000) {
      return 'small';
    } else if (this.student < 40000) {
      return 'medium';
    } else if (this.student < 100000) {
      return 'large';
    } else {
      return 'mega large';
    }
  }

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'text' })
  contact: string;

  @Column({ type: 'text' })
  email: string;

  @Column({ type: 'text' })
  website: string;

  @Column({ type: 'text', nullable: true })
  strength: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', nullable: true })
  exchange: boolean;

  @Column({ type: 'boolean', nullable: true })
  agricultural_food_science: boolean;

  @Column({ type: 'boolean', nullable: true })
  arts_design: boolean;

  @Column({ type: 'boolean', nullable: true })
  economics_business_management: boolean;

  @Column({ type: 'boolean', nullable: true })
  engineering: boolean;

  @Column({ type: 'boolean', nullable: true })
  law_political_science: boolean;

  @Column({ type: 'boolean', nullable: true })
  medicine_pharmacy_health_sciences: boolean;

  @Column({ type: 'boolean', nullable: true })
  physical_science: boolean;

  @Column({ type: 'boolean', nullable: true })
  social_sciences_humanities: boolean;

  @Column({ type: 'boolean', nullable: true })
  sports_physical_education: boolean;

  @Column({ type: 'boolean', nullable: true })
  technology: boolean;

  @Column({ type: 'boolean', nullable: true })
  theology: boolean;

  @Column({ default: false })
  is_deleted: boolean;
}
