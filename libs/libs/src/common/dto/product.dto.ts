import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsNumber,
  ArrayMinSize,
  IsEnum,
  IsMongoId,
  IsOptional,
} from 'class-validator';
import { SizeE } from '../enum';

// Enum cho status và type để dễ quản lý
enum ProductStatus {
  Active = 'active',
  Inactive = 'inactive',
  Suspend = 'suspend',
}

enum ProductType {
  Sale = 'sale',
  Barter = 'barter',
}

export class SizeVariantDto {
  @ApiProperty({
    description: 'Size of the variant',
    example: 'M',
  })
  @IsEnum(SizeE, { message: 'Size must be S, M, L, XL, XXL' })
  @IsNotEmpty()
  size: SizeE;

  @ApiProperty({
    description: 'Colors available for this size variant',
    example: ['red', 'blue'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  colors: string[];

  @ApiProperty({
    description: 'Amount available for this size variant',
    example: 10,
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'The name of the product',
    example: 'Stylish Shirt',
  })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({
    description: 'List of size variants with their respective colors and amounts',
    example: [
      {
        size: 'M',
        colors: ['red', 'blue'],
        amount: 10,
      },
      {
        size: 'L',
        colors: ['green', 'black'],
        amount: 5,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  sizeVariants: SizeVariantDto[];

  @ApiProperty({
    description: 'The material of the product',
    example: 'Cotton',
  })
  @IsString()
  @IsNotEmpty()
  material: string;

  @ApiProperty({
    description: 'Category ID for the product',
    example: '64db23f0e421b3144db7f321',
  })
  @IsMongoId()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    description: 'Brand ID for the product',
    example: '64db23f0e421b3144db7f322',
  })
  @IsMongoId()
  @IsNotEmpty()
  brandId: string;

  @ApiProperty({
    description: 'Status of the product',
    enum: ProductStatus,
    example: ProductStatus.Active,
  })
  @IsEnum(ProductStatus)
  @IsNotEmpty()
  status: ProductStatus;

  @ApiProperty({
    description: 'Type of the product',
    enum: ProductType,
    example: ProductType.Sale,
  })
  @IsEnum(ProductType)
  @IsNotEmpty()
  type: ProductType;

  @ApiProperty({
    description: 'Price of the product',
    example: 100,
  })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({
    description: 'New price of the product',
    example: 80,
  })
  @IsNumber()
  @IsNotEmpty()
  priceNew: number;

  @ApiProperty({
    description: 'Tags associated with the product',
    example: ['fashion', 'shirt' ],
    })
    @IsArray()
    @IsString({ each: true })
    tags: string[];
}

export class DeleteImagesDto {
  @ApiProperty({
    description: 'Array of public IDs of the images to be deleted',
    example: ['share2receive/images/66ed3093b9cc421558a76eb8-1727255164516'],
  })
  @IsArray()
  @IsString({ each: true })
  publicIds: string[];
}
export class UpdateProductDto extends PartialType(CreateProductDto) {
    @ApiProperty({
      description: 'The name of the product',
      example: 'Stylish Shirt',
      required: false,
    })
    @IsOptional()
    @IsString()
    productName?: string;
  
    @ApiProperty({
      description: 'List of size variants with their respective colors and amounts',
      example: [
        {
          size: 'M',
          colors: ['red', 'blue'],
          amount: 10,
        },
        {
          size: 'L',
          colors: ['green', 'black'],
          amount: 5,
        },
      ],
      required: false,
    })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    sizeVariants?: {
      size: SizeE;
      colors: string[];
      amount: number;
    }[];
  
    @ApiProperty({
      description: 'The material of the product',
      example: 'Cotton',
      required: false,
    })
    @IsOptional()
    @IsString()
    material?: string;
  
    @ApiProperty({
      description: 'Category ID for the product',
      example: '64db23f0e421b3144db7f321',
      required: false,
    })
    @IsOptional()
    @IsMongoId()
    categoryId?: string;
  
    @ApiProperty({
      description: 'Brand ID for the product',
      example: '64db23f0e421b3144db7f322',
      required: false,
    })
    @IsOptional()
    @IsMongoId()
    brandId?: string;
  
    @ApiProperty({
      description: 'Status of the product',
      enum: ProductStatus,
      example: ProductStatus.Active,
      required: false,
    })
    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;
  
    @ApiProperty({
      description: 'Type of the product',
      enum: ProductType,
      example: ProductType.Sale,
      required: false,
    })
    @IsOptional()
    @IsEnum(ProductType)
    type?: ProductType;
  
    @ApiProperty({
      description: 'Price of the product',
      example: 100,
      required: false,
    })
    @IsOptional()
    @IsNumber()
    price?: number;
  
    @ApiProperty({
      description: 'New price of the product',
      example: 80,
      required: false,
    })
    @IsOptional()
    @IsNumber()
    priceNew?: number;
  
    @ApiProperty({
      description: 'Tags associated with the product',
      example: ['fashion', 'shirt'],
      required: false,
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
  }
