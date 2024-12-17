import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DetailSupportDto {
  @ApiProperty({ example: 'Title 1', description: 'Tiêu đề hỗ trợ 1' })
  @IsString()
  @IsOptional()
  title_1?: string;

  @ApiProperty({ example: 'Content 1', description: 'Nội dung hỗ trợ 1' })
  @IsString()
  @IsOptional()
  content_1?: string;

  @ApiProperty({ example: 'Title 2', description: 'Tiêu đề hỗ trợ 2' })
  @IsString()
  @IsOptional()
  title_2?: string;

  @ApiProperty({ example: 'Content 2', description: 'Nội dung hỗ trợ 2' })
  @IsString()
  @IsOptional()
  content_2?: string;

  @ApiProperty({ example: 'Title 3', description: 'Tiêu đề hỗ trợ 3' })
  @IsString()
  @IsOptional()
  title_3?: string;

  @ApiProperty({ example: 'Content 3', description: 'Nội dung hỗ trợ 3' })
  @IsString()
  @IsOptional()
  content_3?: string;
}

export class UpdateConfigDto {
  @ApiProperty({ example: 'https://example.com/video1.mp4', description: 'URL cho Video 1' })
  @IsString()
  @IsOptional()
  videoUrl_1?: string;

  @ApiProperty({ example: 'https://example.com/video2.mp4', description: 'URL cho Video 2' })
  @IsString()
  @IsOptional()
  videoUrl_2?: string;

  @ApiProperty({ example: 1.5, description: 'Tỷ lệ chuyển đổi điểm' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  valueToPoint?: number;

  @ApiProperty({ example: 2.0, description: 'Tỷ lệ chuyển đổi khuyến mãi' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  valueToPromotion?: number;
  @ApiProperty({ example: 2.0, description: 'Tỷ lệ chuyển đổi khuyến mãi' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  valueToCross?: number;
  @ApiProperty({ example: 5, description: 'Cảnh báo khiếu nại' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  reportWarning?: number;

  @ApiProperty({ example: 10, description: 'Cảnh báo khóa sản phẩm' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  reprotBlockerProduct?: number;

  @ApiProperty({ example: 20, description: 'Cảnh báo khóa người dùng' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  reportBlockUser?: number;

  @ApiProperty({ description: 'Chi tiết hỗ trợ', type: DetailSupportDto })
  @ValidateNested()
  @Type(() => DetailSupportDto)
  @IsOptional()
  detailSuport?: DetailSupportDto;
}
