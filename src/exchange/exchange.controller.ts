import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@app/libs/common/dto/category.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionGuard } from '@app/libs/common/gaurd';
import { Action, Subject } from '@app/libs/common/decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateExchangeDto } from '@app/libs/common/dto';
import { Exchange } from '@app/libs/common/schema/exchange.schema';

@ApiTags('exchange')
@ApiBearerAuth()
@Controller('exchange')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Post()
  async createExchangeController(
    @Body() dto: CreateExchangeDto,
  ): Promise<{data:any}> {
     const result = this.exchangeService.createExchangeService(dto);
     return {data:result}

  }
}
