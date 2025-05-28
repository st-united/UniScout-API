import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { LocationEntity } from './location.entity';

@Entity('usa_uni')
export class UsaUniEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  university: string;

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ type: 'int', nullable: true })
  rank: number;

  @Column({ type: 'text', nullable: true })
  type: string;

  @Column({ type: 'text', default: 'USA' })
  country: string;

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({ type: 'int', nullable: true })
  student: number;

  @Column({ type: 'int', nullable: true })
  year: number;

  @Column({ type: 'text', nullable: true })
  contact: string;

  @Column({ type: 'text', nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  website: string;

  @Column({ type: 'text', nullable: true })
  strength: string;

  @Column({ type: 'text', nullable: true })
  description: string;

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

  @ManyToOne(() => LocationEntity, { eager: true })
  @JoinColumn([
    { name: 'country', referencedColumnName: 'country' },
    { name: 'location', referencedColumnName: 'location' },
  ])
  locationCoordinates: LocationEntity;
}
