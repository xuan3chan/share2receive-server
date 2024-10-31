import { Controller, Get, Patch, Query, Req, UnauthorizedException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Notification')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  private getUserIdFromToken(request: Request): string {
    const token = (request.cookies.accessToken as string) || '';
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
      return decodedToken._id;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }


  @Get('get-notification')
  async getNotificationByUserId(
    @Req() request: Request,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.notificationService.getNotificationByUserId(userId);
  }
  
  @Patch('update-notification')
  async updateNotificationViewed(
    @Req() request: Request,
    @Query('notificationId') notificationId: string,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.notificationService.updateNotificationViewed(userId,notificationId);
  }
}
