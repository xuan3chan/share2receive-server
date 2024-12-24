import { Body, Controller, Get, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { MemberGuard } from '@app/libs/common/gaurd';
@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

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
  @Post()
  @UseGuards(MemberGuard)
  @ApiBody(
    {
      schema:{
        type:'object',
        properties:{
          isAttendance:{
            type:'boolean'
          }
        }
      }
    }
  )
  async markAttendanceController(
    @Body('isAttendance') isAttendance: boolean,
    @Req() request: Request,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.attendanceService.markAttendanceService(userId,isAttendance);
  }

  @Get('get-attendance')
  @UseGuards(MemberGuard)
  async getAttendanceController(
    @Req() request: Request,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.attendanceService.getWeeklyAttendanceService(userId);
  }
}