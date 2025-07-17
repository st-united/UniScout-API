import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, OneToMany, JoinTable } from 'typeorm';
import { AbstractEntity } from '@Entity/abstract.entity';
import { UniEntity } from './uni.entity';
import { SubjectEntity } from './subject.entity';

@Entity('academic_fields')
export class AcademicFieldEntity extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  name: string;

  @ManyToMany(() => UniEntity, (uni) => uni.academicFields)
  @JoinTable({
    name: 'university_academic_fields',
    joinColumn: { name: 'academicFieldId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'uniId', referencedColumnName: 'id' },
  })
  universities: UniEntity[];

  @OneToMany(() => SubjectEntity, (subject: SubjectEntity) => subject.academicField)
  subjects: SubjectEntity[];
  isDeleted: any;
}
