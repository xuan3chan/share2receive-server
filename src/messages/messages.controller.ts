import { MessagesService } from './messages.service';
import { Message } from '@app/libs/common/schema';
import { Controller, Get, Param, Patch, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MemberGuard } from '@app/libs/common/gaurd';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}
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
  @Get('get-room')
  @UseGuards(MemberGuard)
  async getMessagesInRoomController(
    @Req() request:Request): Promise<Message[]> {
    const userId = this.getUserIdFromToken(request);
    return this.messagesService.getRoomMessagesService(userId);}
}

