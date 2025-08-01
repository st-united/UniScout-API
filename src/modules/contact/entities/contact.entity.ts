import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { RequestTypeEnum } from '@Constant/enums';

export enum SubmissionStatusEnum {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  REJECTED = 'Rejected',
  COMPLETED = 'Completed',
}

@Entity('contact_submissions')
export class ContactSubmissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: RequestTypeEnum, default: RequestTypeEnum.NEW_UNIVERSITY })
  requestType: RequestTypeEnum;

  @Column()
  universityName: string;

  @Column({ nullable: true })
  representativeName: string;

  @Column({ nullable: true })
  representativeEmail: string;

  @Column({ nullable: true })
  representativeNumber: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ nullable: true })
  abbreviation: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  type: string;

  @Column({ nullable: true })
  universityEmail: string;

  @Column({ nullable: true })
  universityNumber: string;

  @Column({ nullable: true })
  website: string;

  @Column('simple-array', { nullable: true })
  attachmentFilePaths: string[];

  @Column({ nullable: true })
  subjectsExcelFilePath: string;

  @Column({ nullable: true })
  numberOfStudents: number;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  submittedAt: Date;

  @Column({
    type: 'enum',
    enum: SubmissionStatusEnum,
    default: SubmissionStatusEnum.PENDING,
  })
  status: SubmissionStatusEnum;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;
}
