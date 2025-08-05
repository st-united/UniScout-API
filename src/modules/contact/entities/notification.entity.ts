import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ContactSubmissionEntity } from './contact.entity';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  adminId: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column()
  submissionId: number;

  @ManyToOne(() => ContactSubmissionEntity)
  @JoinColumn({ name: 'submissionId' })
  submission: ContactSubmissionEntity;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;
}
