import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { ContactSubmissionEntity, NotificationEntity } from '../contact/entities';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationService {
  private readonly _logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly _notificationRepo: Repository<NotificationEntity>,
    @InjectRepository(ContactSubmissionEntity)
    private readonly _contactSubmissionRepo: Repository<ContactSubmissionEntity>
  ) {}

  async createNotification(adminId: number, submissionId: number, title: string, message: string) {
    const submission = await this._contactSubmissionRepo.findOneBy({ id: submissionId });
    if (!submission) {
      this._logger.error(`Attempted to create notification for non-existent submission ID: ${submissionId}`);
      return;
    }

    const newNotification = this._notificationRepo.create({
      adminId,
      submissionId,
      title,
      message,
      submission,
    });
    await this._notificationRepo.save(newNotification);
    this._logger.log(`Notification created for admin ${adminId} for submission ${submissionId}`);
  }

  async getNotifications(adminId: number, page = 1, pageSize = 10, isRead?: boolean) {
    const qb = this._notificationRepo
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.submission', 'submission')
      .where('notification.adminId = :adminId', { adminId })
      .orderBy('notification.createdAt', 'DESC')
      .take(pageSize)
      .skip((page - 1) * pageSize);

    if (typeof isRead === 'boolean') {
      qb.andWhere('notification.isRead = :isRead', { isRead });
    }

    const [notifications, total] = await qb.getManyAndCount();

    return {
      data: notifications,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async markAsRead(notificationId: number, adminId: number) {
    const notification = await this._notificationRepo.findOneBy({ id: notificationId, adminId });

    if (!notification) {
      throw new HttpException('Notification not found or unauthorized.', HttpStatus.NOT_FOUND);
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this._notificationRepo.save(notification);
      this._logger.log(`Notification ${notificationId} marked as read by admin ${adminId}`);
    }
    return notification;
  }

  async getUnreadNotificationCount(adminId: number): Promise<number> {
    return this._notificationRepo.count({
      where: {
        adminId,
        isRead: false,
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanOldNotifications() {
    this._logger.log('Running scheduled job to clean old notifications...');
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await this._notificationRepo.delete({
      createdAt: MoreThanOrEqual(oneYearAgo),
    });

    const deletedResult = await this._notificationRepo
      .createQueryBuilder()
      .delete()
      .from(NotificationEntity)
      .where('createdAt <= :date', { date: oneYearAgo })
      .execute();

    this._logger.log(`Deleted ${deletedResult.affected} old notifications.`);
  }
}
