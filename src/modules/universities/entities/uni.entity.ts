import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
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
  studentPopulation: number;

  get size(): 'small' | 'medium' | 'large' | 'extra large' {
    if (this.studentPopulation < 20000) {
      return 'small';
    } else if (this.studentPopulation < 40000) {
      return 'medium';
    } else if (this.studentPopulation < 100000) {
      return 'large';
    } else {
      return 'extra large';
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
  agriculturalFoodScience: boolean;

  @Column({ type: 'boolean', nullable: true })
  artsDesign: boolean;

  @Column({ type: 'boolean', nullable: true })
  economicsBusinessManagement: boolean;

  @Column({ type: 'boolean', nullable: true })
  lawPoliticalScience: boolean;

  @Column({ type: 'boolean', nullable: true })
  medicinePharmacyHealthSciences: boolean;

  @Column({ type: 'boolean', nullable: true })
  scienceEngineering: boolean;

  @Column({ type: 'boolean', nullable: true })
  socialSciencesHumanities: boolean;

  @Column({ type: 'boolean', nullable: true })
  sportsPhysicalEducation: boolean;

  @Column({ type: 'boolean', nullable: true })
  technology: boolean;

  @Column({ type: 'boolean', nullable: true })
  others: boolean;

  @Column({ default: false })
  isDeleted: boolean;
}
