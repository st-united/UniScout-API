import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity, AuditActionType } from './entities/audit-log.entity';
import { UserEntity } from '@UsersModule/entities';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>
  ) {}

  async log(
    actorId: number | null,
    actionType: AuditActionType,
    targetUserId: number,
    oldValue: Record<string, any> | null,
    newValue: Record<string, any> | null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      actorId,
      actionType,
      targetUserId,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
    });
    await this.auditLogRepository.save(auditLog);
  }
}
