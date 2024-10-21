import { BadRequestException, Injectable } from '@nestjs/common';
import { Exchange,ExchangeDocument } from '@app/libs/common/schema/exchange.schema';
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
  ) {}

  async createExchangeService(
    requesterId: string,
    createExchangeDto: CreateExchangeDto,
  ): Promise<any> {
    const requester = await this.userModel.findById(requesterId);
    if (!requester) {
      throw new BadRequestException('User not found');
    }
  
    const requesterProduct = await this.productModel.findById(createExchangeDto.requestProduct.productId);
    const receiverProduct = await this.productModel.findById(createExchangeDto.receiveProduct.productId);
    
    if (!requesterProduct || !receiverProduct) {
      throw new BadRequestException('Product not found');
    }
    
    if (requesterProduct.status !== 'active' || receiverProduct.status !== 'active') {
      throw new BadRequestException('Product not active');
    }
    
    if (requesterProduct.isBlock || receiverProduct.isBlock) {
      throw new BadRequestException('Product is blocked');
    }
    
    if (requesterProduct.userId.toString() === receiverProduct.userId.toString()) {
      throw new BadRequestException('Cannot exchange with yourself');
    }
    
    if (requesterProduct.approved.approveStatus !== 'approved' || receiverProduct.approved.approveStatus !== 'approved') {
      throw new BadRequestException('Product not approved');
    }
  
    // Tạo đối tượng exchange mới và gán các giá trị bắt buộc
    const exchange = new this.exchangeModel({
      requesterId: requesterId,
      receiverId: receiverProduct.userId,
      requestProduct: {
        requesterProductId: requesterProduct._id, // Gán ID sản phẩm yêu cầu
        size: createExchangeDto.requestProduct.size,
        colors: createExchangeDto.requestProduct.colors,
        amount: createExchangeDto.requestProduct.amount,
      },
      receiveProduct: {
        receiverProductId: receiverProduct._id, // Gán ID sản phẩm nhận
        size: createExchangeDto.receiveProduct.size,
        colors: createExchangeDto.receiveProduct.colors,
        amount: createExchangeDto.receiveProduct.amount,
      },
      note: createExchangeDto.note, // Gán ghi chú nếu có
    });
  
    await exchange.save();
    return exchange;
  }
  
}
