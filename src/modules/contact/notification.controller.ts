import {
  Controller,
  Get,
  Query,
  HttpStatus,
  HttpException,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { NotificationEntity } from './entities';
import { JwtAccessTokenGuard } from '@AuthModule/guards/jwt-access-token.guard';

@UseGuards(JwtAccessTokenGuard)
@ApiBearerAuth('JWT-auth')
@Controller('admin/notifications')
export class NotificationController {
  constructor(private readonly _notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of notifications for the current admin' })
  @ApiResponse({ status: 200, type: [NotificationEntity] })
  async getNotifications(
    @Req() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 10,
    @Query('isRead') isRead?: string
  ) {
    const adminId = req.user?.userId || req.user?.id;
    if (!adminId) throw new UnauthorizedException('Missing admin ID from JWT payload');

    const filterIsRead = isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    const notifications = await this._notificationService.getNotifications(adminId, page, pageSize, filterIsRead);
    return notifications;
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, type: NotificationEntity })
  @ApiResponse({ status: 404, description: 'Notification not found or unauthorized' })
  async markNotificationAsRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const adminId = req.user?.userId || req.user?.id;
    if (!adminId) throw new UnauthorizedException('Missing admin ID from JWT payload');

    try {
      const updatedNotification = await this._notificationService.markAsRead(id, adminId);
      return updatedNotification;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to mark notification as read.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for the current admin' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllNotificationsAsRead(@Req() req: any) {
    const adminId = req.user?.userId || req.user?.id;
    if (!adminId) throw new UnauthorizedException('Missing admin ID from JWT payload');
    await this._notificationService.markAllAsRead(adminId);
    return { message: 'All notifications have been marked as read.' };
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get the count of unread notifications for the current admin' })
  @ApiResponse({ status: 200, type: Number })
  async getUnreadNotificationCount(@Req() req: any) {
    const adminId = req.user?.userId || req.user?.id;
    if (!adminId) throw new UnauthorizedException('Missing admin ID from JWT payload');
    const count = await this._notificationService.getUnreadNotificationCount(adminId);
    return { count };
  }
}
