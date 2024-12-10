import { ReportService } from './report.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { request, Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';

import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MemberGuard, PermissionGuard } from '@app/libs/common/gaurd';
import { CreateReportDto } from '@app/libs/common/dto';
import { Action, Subject } from '@app/libs/common/decorator';

@ApiTags('Report')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}
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

  @Post()
  // @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Create Report for user' })
  @ApiCreatedResponse({ description: 'Report created successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @HttpCode(201)
  async createReportController(
    @Body() createReportDto: CreateReportDto,
    @Req() request: Request,
  ): Promise<any> {
    try {
      const userId = this.getUserIdFromToken(request);
      return await this.reportService.createReportService(userId, createReportDto);
    } catch (error) {
      console.error('Error creating report:', error);
      throw new BadRequestException(error.message);
    }
  }
  @Get()
  @UseGuards(PermissionGuard)
  @Action('read')
  @Subject('report')
  @ApiQuery({ name: 'reportType', required: false,enum:['order','product'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  async getListReportService(
    @Query('reportType') reportType: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: string,
  ) {
    const pageNumber = page ? parseInt(page.toString()) : 1;
    const limitNumber = limit ? parseInt(limit.toString()) : 10;
    return await this.reportService.getListReportService(
      reportType,
      pageNumber,
      limitNumber,
      sortBy,
      sortOrder,

    );
   } 
   @Patch('block-user/:reportId')
   @UseGuards(PermissionGuard)
   @Action('block')
   @Subject('report')
   async blockFromReportController(
    @Param('reportId') reportId: string,
   ){
      return await this.reportService.blockFromReportService(reportId);
   }
   @Patch('block-product/:reportId')
   @UseGuards(PermissionGuard)
   @Action('block')
   @Subject('report')
    async blockProductFromReportController(
      @Param('reportId') reportId: string,
    ){
        return await this.reportService.blockProductService(reportId);
    }

    @Post('warning-user/:reportId')
    @UseGuards(PermissionGuard)
    @Action('warning')
    @Subject('report')
    async warningUserFromReportController(
      @Param('reportId') reportId: string,
    ){
        return await this.reportService.warningUserService(reportId);
    }

    @Patch('check-report/:reportId')
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          isChecked: { type: 'boolean' },
        },
        required: ['isChecked'],
      },
    })
    @UseGuards(PermissionGuard)
    @Action('check')
    @Subject('report')
    async checkReportController(
      @Param('reportId') reportId: string,
      @Body('isChecked') isChecked: boolean,
    ){
        return await this.reportService.checkReportService(reportId,isChecked);
    }
    @Get('get-history-report')
    @UseGuards(PermissionGuard)
    @Action('read')
    @Subject('report')
    async getHistoryReportController(){
      return await this.reportService.getHistoryReportService();
    }
}
