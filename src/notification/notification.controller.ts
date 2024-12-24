import { Controller, Get, Patch, Query, Req, UnauthorizedException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  private getUserIdFromToken(request: Request): string {
      try {
        const token = (request.headers as any).authorization.split(' ')[1]; // Bearer <token>
        const decodedToken = jwt.verify(
          token,
          process.env.JWT_SECRET,
        ) as JwtPayload;
        return decodedToken._id;
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new UnauthorizedException('Token has expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
          throw new UnauthorizedException('Invalid token');
        } else {
          throw new UnauthorizedException('Token not found');
        }
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
