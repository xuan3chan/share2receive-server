import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNotEmpty, ValidateNested } from 'class-validator';

export class ShallDto {
  @ApiProperty({ description: 'Người phê duyệt', example: 'admin123' })
  @IsOptional()
  @IsString()
  decisionBy: string;

  @ApiProperty({ description: 'Mô tả quyết định', example: 'Approved after review' })
  @IsOptional()
  @IsString()
  description: string;
}

export class CreateEvidenceDto {

  @ApiProperty({ description: 'Thông tin phê duyệt', type: ShallDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShallDto)
  approved: ShallDto;
}
