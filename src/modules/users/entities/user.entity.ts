import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';
import { BeforeInsert, Column, Entity, JoinTable, ManyToMany, ManyToOne, Unique } from 'typeorm';

import { StatusEnum, UserRole } from '@Constant/enums';
import { AbstractEntity } from '@Entity/abstract.entity';

@Entity('users')
@Unique('UQ_users_email_deletedAt', ['email', 'deletedAt'])
@Unique('UQ_users_phone_deletedAt', ['phone', 'deletedAt'])
@Unique('UQ_users_identityId_deletedAt', ['identityId', 'deletedAt'])
export class UserEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  phone: string;

  @Column({ type: 'varchar' })
  @Exclude()
  password: string;

  @Column({ type: 'enum', enum: StatusEnum, default: StatusEnum.ACTIVE })
  status: StatusEnum;

  @Column({ type: 'varchar', length: 50, nullable: true })
  name: string;

  @Column({ type: 'timestamp', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'varchar', nullable: true, length: 200 })
  address: string;

  @Column({
    type: 'int',
    unique: true,
    nullable: true,

    generated: 'increment',
  })
  identityId: number;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  refreshToken: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  job: string;

  @BeforeInsert()
  async hasPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  @Column({ type: 'varchar', nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ADMIN,
  })
  role: UserRole;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockoutUntil: Date | null;
}
