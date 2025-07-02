import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { RequestTypeEnum } from '@Constant/enums';

@Entity('contact_submissions')
export class ContactSubmissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  universityName: string;

  @Column({ nullable: true })
  phoneNumber: string;
  @Column({ type: 'enum', enum: RequestTypeEnum, default: RequestTypeEnum.NEW_UNIVERSITY })
  requestType: RequestTypeEnum;

  @Column({ type: 'text', default: '' })
  message: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  type: string;

  @Column({ nullable: true })
  universityEmail: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  broadFieldOfStudy: string;

  @Column({ nullable: true })
  specificFieldOfStudy: string;

  @Column({ nullable: true })
  rank: number;

  @Column({ nullable: true })
  numberOfStudents: number;

  @CreateDateColumn()
  submittedAt: Date;
}
