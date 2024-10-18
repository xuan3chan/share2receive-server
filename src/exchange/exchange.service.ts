import { Injectable } from '@nestjs/common';
import { Exchange } from '@app/libs/common/schema/exchange.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateExchangeDto } from '@app/libs/common/dto';
import { Product, User } from '@app/libs/common/schema';


@Injectable()
export class ExchangeService {
    constructor(
        @InjectModel(Exchange.name) private exchangeModel: Model<Exchange>,
        @InjectModel(Product.name) private productModel: Model<Product>,
        @InjectModel(User.name) private userModel: Model<User>,
    ){}

  async createExchangeService(createExchangeDto: CreateExchangeDto): Promise<any> {
    const {...dto}= CreateExchangeDto
    console.log(dto)
    const exitsProduct = await this.productModel.findById(createExchangeDto).exec();
    const createdExchange = new this.exchangeModel(createExchangeDto);
    
}
}