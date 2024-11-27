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
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';

export class UpdateInfoOrderDto{
    
    @ApiProperty({
        description: 'Address of the order',
        example: 'Thanh Pu, Chau Thanh, Tien Ging',
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    address:string

    @ApiProperty({
        description: 'Phone number of the order',
        example: '0123456789',
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    phone:string

    @ApiProperty({
        description: 'Type of the order',
        example: 'momo_wallet',
    })
    @IsString()
    @IsOptional()
    type:string
}

export class CreateOrderByProductDto{
    @ApiProperty({
        description: 'Product ID',
        example: '123456',
    })
    @IsMongoId()
    @IsNotEmpty()
    productId:string

    @ApiProperty({
        description: 'Quantity of the product',
        example: 2,
    })
    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    quantity:number

    @ApiProperty({
        description: 'Size of the product',
        example: 'M',
    })
    @IsString()
    @IsNotEmpty()
    size:string

    @ApiProperty({
        description: 'Color of the product',
        example: 'red',
    })
    @IsString()
    @IsNotEmpty()
    color:string
}

export class UpdateSubOrderDto{
    @ApiProperty({
        description: 'Status of the order',
        example: 'shipping',
    })
    @IsString()
    @IsOptional()
    status:string
}
export class UpdateShippingDto{
    
    @ApiProperty({
        description: 'Shipping service',
        example: 'GHN',
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    shippingService:string

    @ApiProperty({
        description: 'note',
        example: 'Giao hàng nhanh nha',
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    @MaxLength(255)
    note:string
}
export class RequestRefundDto{

    @ApiProperty({
        description: 'Banking number',
        example: '123456789',
    })
    @IsString()
    @IsNotEmpty()
    bankingNumber:string

    @ApiProperty({
        description: 'Banking name',
        example: 'Vietcombank',
    })
    @IsString()
    @IsNotEmpty()
    bankingName:string

    @ApiProperty({
        description: 'Banking name user',
        example: 'Nguyen Van A',
    })
    @IsString()
    @IsNotEmpty()
    bankingNameUser:string

    @ApiProperty({
        description: 'Banking branch',
        example: 'HCM',
    })
    @IsString()
    @IsNotEmpty()
    bankingBranch:string

    @ApiProperty({
        description: 'Reason',
        example: 'Nguoi ban khong gui hang',
    })
    @IsString()
    @IsNotEmpty()
    reason:string
}