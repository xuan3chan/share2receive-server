import { Body, Controller, Get, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  private getUserIdFromToken(request: Request): string {
    const token = (request.cookies.accessToken as string) || '';
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }
    try {
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET,
      ) as JwtPayload;
      return decodedToken._id;
    } catch (error) {
        console.log('error',error)
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
  @Post()
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
  @ApiQuery({ name: 'moth', required: true })
  @ApiQuery({ name: 'year', required: true })
  async getAttendanceController(
    @Req() request: Request,
    @Query('moth') month: number,
    @Query('year') year: number,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.attendanceService.getWeeklyAttendanceService(userId,month,year);
  }
  
}
