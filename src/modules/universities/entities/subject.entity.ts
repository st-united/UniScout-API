import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, ManyToMany } from 'typeorm';
import { AbstractEntity } from '@Entity/abstract.entity';
import { UniEntity } from './uni.entity';
import { AcademicFieldEntity } from './academic-field.entity';

@Entity('subjects')
export class SubjectEntity extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  name: string;

  @ManyToOne(() => AcademicFieldEntity, (academicField) => academicField.subjects)
  academicField: AcademicFieldEntity;

  @ManyToMany(() => UniEntity, (uni) => uni.subjects)
  universities: UniEntity[];
}
