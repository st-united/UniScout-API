import { Entity, PrimaryGeneratedColumn, Column, JoinTable, ManyToMany } from 'typeorm';
import { AbstractEntity } from '@Entity/abstract.entity';
import { UniversityTypeEnum } from '../dto/get-university.dto';
import { AcademicFieldEntity } from './academic-field.entity';
import { SubjectEntity } from './subject.entity';

export enum AcademicFieldEnum {
  AGRICULTURAL_VETERINARY_SCIENCES = 'agricultural_veterinary_sciences',
  ARTS_DESIGN = 'arts_design',
  BUSINESS_MANAGEMENT_LAW = 'business_management_law',
  EDUCATION_TRAINING = 'education_training',
  ENGINEERING_TECHNOLOGY = 'engineering_technology',
  HEALTH_MEDICINE = 'health_medicine',
  HUMANITIES_LANGUAGES = 'humanities_languages',
  ICT = 'ict',
  NATURAL_SCIENCES = 'natural_sciences',
  SOCIAL_BEHAVIORAL_SCIENCES = 'social_behavioral_sciences',
  SERVICES = 'services',
  TRANSPORT_SAFETY_SECURITY_MILITARY = 'transport_safety_security_military',
}

@Entity('uni')
export class UniEntity extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  university: string;

  @Column({ type: 'text' })
  abbreviation: string;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ type: 'int', nullable: true })
  rank: number;

  @Column({ type: 'text' })
  type: UniversityTypeEnum;

  @Column({ type: 'text' })
  country: string;

  @Column({ type: 'text' })
  location: string;

  @Column({ type: 'int' })
  studentPopulation: number;
  totalFaculties: any;
  totalStudents: any;
  name: string;
  students: string;

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

  @Column({ type: 'int', nullable: true })
  year: number;

  @Column({ type: 'text', unique: true, nullable: true })
  contact: string;

  @Column({ type: 'text', unique: true, nullable: true })
  email: string;

  @Column({ type: 'text', unique: true })
  website: string;

  @Column({ type: 'text', nullable: true })
  strength: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', nullable: true })
  exchange: boolean;

  @ManyToMany(() => AcademicFieldEntity, (academicField) => academicField.universities)
  @JoinTable({
    name: 'university_academic_fields',
    joinColumn: { name: 'uniId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'academicFieldId', referencedColumnName: 'id' },
  })
  academicFields: AcademicFieldEntity[];

  @ManyToMany(() => SubjectEntity, (subject) => subject.universities)
  @JoinTable({
    name: 'university_subjects',
    joinColumn: { name: 'uniId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'subjectId', referencedColumnName: 'id' },
  })
  subjects: SubjectEntity[];

  @Column({ default: false })
  isDeleted: boolean;
}
