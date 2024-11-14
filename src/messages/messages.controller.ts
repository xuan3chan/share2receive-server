import { MessagesService } from './messages.service';
import { Message } from '@app/libs/common/schema';
import { Controller, Get, Param, Patch, Query, Req, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}
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
  @Get('get-room')
  async getMessagesInRoomController(
    @Req() request:Request): Promise<Message[]> {
    const userId = this.getUserIdFromToken(request);
    return this.messagesService.getRoomMessagesService(userId);}
}

