import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { AbstractEntity } from '@Entity/abstract.entity';
import { UniEntity } from './uni.entity';
import { AcademicFieldEntity } from './academic-field.entity';

@Entity('subjects')
export class SubjectEntity extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  name: string;

  @ManyToMany(() => AcademicFieldEntity, (af) => af.subjects, { cascade: true })
  @JoinTable({
    name: 'subject_academic_fields',
    joinColumn: { name: 'subjectId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'academicFieldId', referencedColumnName: 'id' },
  })
  academicFields: AcademicFieldEntity[];

  @ManyToMany(() => UniEntity, (uni) => uni.subjects)
  universities: UniEntity[];
}
