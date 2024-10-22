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
    if (receiverProduct.type || requesterProduct.type !== 'barter') {
      
        throw new BadRequestException('Product type is not barter');
      
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
  
   async getListExchangeService(userId: string): Promise<any[]> {
    const listExchange = await this.exchangeModel.find({
      $or: [{ requesterId: userId }, { receiverId: userId }],
    })
    .populate('requesterId', 'firstname lastname avatar')
    .populate('receiverId', 'firstname lastname avatar')
    .populate('requestProduct.requesterProductId', 'productName imgUrls')
    .populate('receiveProduct.receiverProductId', 'productName imgUrls')
    .lean(); // Dùng lean() để trả về plain objects thay vì Mongoose documents
    // Tái cấu trúc dữ liệu để xác định vai trò của userId
    const structuredExchanges = listExchange.map((exchange) => ({
      ...exchange, // Sao chép tất cả các thuộc tính của exchange
      role: (exchange.requesterId as any)._id.toString() === userId ? 'requester' : 'receiver', // Xác định vai trò
    }));
  
    return structuredExchanges;
  }

  async updateStatusExchangeService(
    userId: string,
    exchangeId: string,
    status: string,
  ): Promise<any> {
    const session = await this.exchangeModel.db.startSession();
    session.startTransaction();
  
    try {
      // Find the exchange with the session
      const exchange = await this.exchangeModel.findById(exchangeId).session(session);
      if (!exchange) {
        throw new BadRequestException('Exchange not found');
      }
  
      if (exchange.exchangeStatus !== 'pending') {
        throw new BadRequestException('Exchange status is not pending');
      }
  
      if (exchange.receiverId.toString() !== userId) {
        throw new BadRequestException('You are not the receiver');
      }
  
      // Check for stock availability for both products
      const [requesterProductUpdate, receiverProductUpdate] = await Promise.all([
        this.productModel.findOne(
          {
            _id: exchange.requestProduct.requesterProductId,
            'sizeVariants.size': exchange.requestProduct.size,
            'sizeVariants.colors': exchange.requestProduct.colors,
          }
        ).lean(),
        this.productModel.findOne(
          {
            _id: exchange.receiveProduct.receiverProductId,
            'sizeVariants.size': exchange.receiveProduct.size,
            'sizeVariants.colors': exchange.receiveProduct.colors,
          }
        ).lean()
      ]);
  
      // Function to validate stock for a product
      const validateStock = (productUpdate, exchangeProduct) => {
        const variant = productUpdate?.sizeVariants.find(
          v => v.size === exchangeProduct.size && v.colors === exchangeProduct.colors
        );
        return variant && variant.amount >= exchangeProduct.amount;
      };
  
      if (!validateStock(requesterProductUpdate, exchange.requestProduct) || 
          !validateStock(receiverProductUpdate, exchange.receiveProduct)) {
        throw new BadRequestException('Not enough stock to accept the exchange');
      }
  
      // Update exchange status
      if (status === 'accepted') {
        exchange.exchangeStatus = 'accepted';
        exchange.requesterExchangeStatus = 'pending';
        exchange.receiverExchangeStatus = 'pending';
  
        // Update stock for both products in parallel
        await Promise.all([
          this.productModel.updateOne(
            {
              _id: exchange.requestProduct.requesterProductId,
              'sizeVariants.size': exchange.requestProduct.size,
              'sizeVariants.colors': exchange.requestProduct.colors,
            },
            { $inc: { 'sizeVariants.$.amount': -exchange.requestProduct.amount } },
            { session }
          ),
          this.productModel.updateOne(
            {
              _id: exchange.receiveProduct.receiverProductId,
              'sizeVariants.size': exchange.receiveProduct.size,
              'sizeVariants.colors': exchange.receiveProduct.colors,
            },
            { $inc: { 'sizeVariants.$.amount': -exchange.receiveProduct.amount } },
            { session }
          )
        ]);
  
        // Set status to 'Exchanged' if stock hits 0 for either product
        const updateExchangedStatus = async (productUpdate, productId) => {
          if (productUpdate.sizeVariants.every(variant => variant.amount === 0)) {
            await this.productModel.updateOne(
              { _id: productId },
              { $set: { status: 'Exchanged' } },
              { session }
            );
          }
        };
  
        await Promise.all([
          updateExchangedStatus(requesterProductUpdate, exchange.requestProduct.requesterProductId),
          updateExchangedStatus(receiverProductUpdate, exchange.receiveProduct.receiverProductId)
        ]);
      } else if (status === 'rejected') {
        exchange.exchangeStatus = 'rejected';
      } else {
        throw new BadRequestException('Invalid status');
      }
  
      // Save exchange and commit transaction
      await exchange.save({ session });
      await session.commitTransaction();
  
      // Convert to plain object and return
      return exchange.toObject();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  

  async updateExchangeStatuswhenShippingService(
    exchangeId: string,
    userId: string,
    status: string,
  ): Promise<any> {
    const exchange = await this.exchangeModel.findById(exchangeId);
    if (!exchange) {
      throw new BadRequestException('Exchange not found');
    }
  
    if (exchange.exchangeStatus !== 'accepted') {
      throw new BadRequestException('Exchange status is not accepted');
    }
  
    if (exchange.requesterId.toString() !== userId && exchange.receiverId.toString() !== userId) {
      throw new BadRequestException('You are not the requester or receiver');
    }
  
    if (exchange.requesterId.toString() === userId) {
      exchange.requesterExchangeStatus = status;
    } else {
      exchange.receiverExchangeStatus = status;
    }
  
    await exchange.save();
    return exchange;
  }
  
  
  
  
  
}
