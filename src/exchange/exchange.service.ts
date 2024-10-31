import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Exchange,
  ExchangeDocument,
} from '@app/libs/common/schema/exchange.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateExchangeDto } from '@app/libs/common/dto';
import { Product, User } from '@app/libs/common/schema';
import { EventGateway } from '@app/libs/common/util/event.gateway';
import { ShippingStatusE } from '@app/libs/common/enum/shipping-status.enum';

@Injectable()
export class ExchangeService {
  constructor(
    @InjectModel(Exchange.name) private exchangeModel: Model<Exchange>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel('Rating') private ratingModel: Model<ExchangeDocument>,
    private eventGateway: EventGateway,
  ) {}

  async createExchangeService(
    requesterId: string,
    createExchangeDto: CreateExchangeDto,
  ): Promise<any> {
    const requester = await this.userModel.findById(requesterId);
    if (!requester) {
      throw new BadRequestException('User not found');
    }

    const requesterProduct = await this.productModel.findById(
      createExchangeDto.requestProduct.productId,
    );
    const receiverProduct = await this.productModel.findById(
      createExchangeDto.receiveProduct.productId,
    );

    if (!requesterProduct || !receiverProduct) {
      throw new BadRequestException('Product not found');
    }

    if (
      requesterProduct.status !== 'active' ||
      receiverProduct.status !== 'active'
    ) {
      throw new BadRequestException('Product not active');
    }

    if (requesterProduct.isBlock || receiverProduct.isBlock) {
      throw new BadRequestException('Product is blocked');
    }
    if (
      receiverProduct.type !== 'barter' ||
      requesterProduct.type !== 'barter'
    ) {
      throw new BadRequestException('Product type is not barter');
    }

    if (
      requesterProduct.userId.toString() === receiverProduct.userId.toString()
    ) {
      throw new BadRequestException('Cannot exchange with yourself');
    }

    if (
      requesterProduct.approved.approveStatus !== 'approved' ||
      receiverProduct.approved.approveStatus !== 'approved'
    ) {
      throw new BadRequestException('Product not approved');
    }

    this.productModel.updateOne(
      { _id: requesterProduct._id },
      { $set: { status: 'exchanging' } },
    );
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
    this.eventGateway.sendAuthenticatedNotification(
      receiverProduct.userId.toString(),
      'You have a new exchange request',
    );
    return exchange;
  }

  async getListExchangeService(
    userId: string,
    filterUserId?: string[],
    filterRole?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ total: number; data: any[] }> {
    const baseConditions = filterRole === 'requester'
      ? { requesterId: userId }
      : filterRole === 'receiver'
      ? { receiverId: userId }
      : { $or: [{ requesterId: userId }, { receiverId: userId }] };
  
    const queryConditions = {
      ...baseConditions,
      ...(filterUserId ? { [filterRole === 'requester' ? 'receiverId' : 'requesterId']: { $in: filterUserId } } : {}),
    };
  
    // Get total count of documents matching the query (without pagination)
    const total = await this.exchangeModel.countDocuments(queryConditions);
  
    // Get paginated list of exchanges
    const listExchange = await this.exchangeModel
      .find(queryConditions)
      .populate('requesterId', 'firstname lastname avatar email')
      .populate('receiverId', 'firstname lastname avatar email')
      .populate('requestProduct.requesterProductId', 'productName imgUrls')
      .populate('receiveProduct.receiverProductId', 'productName imgUrls')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  
    const structuredExchanges = listExchange.map((exchange) => ({
      ...exchange,
      role: (exchange.requesterId as any)._id.toString() === userId ? 'requester' : 'receiver',
    }));
  
    return {
      total,
      data: structuredExchanges,
    };
  }
  
  
  

  async getExchangeDetailService(
    userId: string,
    exchangeId: string,
  ): Promise<any> {
    const exchange = await this.exchangeModel
      .findById(exchangeId)
      .populate('requesterId', 'firstname lastname avatar email')
      .populate('receiverId', 'firstname lastname avatar email')
      .populate('requestProduct.requesterProductId', 'productName imgUrls')
      .populate('receiveProduct.receiverProductId', 'productName imgUrls')
      .lean();
  
    if (!exchange) {
      throw new BadRequestException('Exchange not found');
    }
  
    // Xác định vai trò của userId trong exchange (requester hoặc receiver)
    let role = '';
    if ((exchange.requesterId as any)._id.toString() === userId) {
      role = 'requester';
    } else if ((exchange.receiverId as any)._id.toString() === userId) {
      role = 'receiver';
    } else {
      throw new BadRequestException('You are not a participant in this exchange');
    }
  
    // Lấy thông tin đánh giá của cả requester và receiver cho giao dịch này
    const requesterRating = await this.ratingModel.findOne({
      userId: (exchange.requesterId as any)._id,
      targetId: exchangeId,
      targetType: 'exchange',
    }).lean();
  
    const receiverRating = await this.ratingModel.findOne({
      userId: (exchange.receiverId as any)._id,
      targetId: exchangeId,
      targetType: 'exchange',
    }).lean();
  
    return {
      ...exchange,
      role,
      ratings: {
        requesterRating: requesterRating || null,
        receiverRating: receiverRating || null,
      },
    };
  }
  

  async updateStatusExchangeService(
    userId: string,
    exchangeId: string,
    status: string,
  ): Promise<any> {
    const session = await this.exchangeModel.db.startSession();
    session.startTransaction();

    try {
      const exchange = await this.exchangeModel
        .findById(exchangeId)
        .session(session);
      if (!exchange) {
        throw new BadRequestException('Exchange not found');
      }

      if (exchange.allExchangeStatus !== 'pending') {
        throw new BadRequestException('Exchange status is not pending');
      }

      if (exchange.receiverId.toString() !== userId) {
        throw new BadRequestException('You are not the receiver');
      }

      const [requesterProductUpdate, receiverProductUpdate] = await Promise.all(
        [
          this.productModel
            .findOne({
              _id: exchange.requestProduct.requesterProductId,
              'sizeVariants.size': exchange.requestProduct.size,
              'sizeVariants.colors': exchange.requestProduct.colors,
            })
            .lean(),
          this.productModel
            .findOne({
              _id: exchange.receiveProduct.receiverProductId,
              'sizeVariants.size': exchange.receiveProduct.size,
              'sizeVariants.colors': exchange.receiveProduct.colors,
            })
            .lean(),
        ],
      );

      const validateStock = (productUpdate, exchangeProduct) => {
        const variant = productUpdate?.sizeVariants.find(
          (v) =>
            v.size === exchangeProduct.size &&
            v.colors === exchangeProduct.colors,
        );
        return variant && variant.amount >= exchangeProduct.amount;
      };

      if (
        !validateStock(requesterProductUpdate, exchange.requestProduct) ||
        !validateStock(receiverProductUpdate, exchange.receiveProduct)
      ) {
        throw new BadRequestException(
          'Not enough stock to accept the exchange',
        );
      }

      if (status === 'accepted') {
        exchange.allExchangeStatus = 'accepted';
        //add field 
        exchange.receiverStatus = {
          exchangeStatus: 'pending',
          confirmStatus: null,
          statusDate: new Date()
        }
        exchange.requestStatus = {
          exchangeStatus: 'pending',
          confirmStatus: null,
          statusDate: new Date()
        }

        await Promise.all([
          this.productModel.updateOne(
            {
              _id: exchange.requestProduct.requesterProductId,
              'sizeVariants.size': exchange.requestProduct.size,
              'sizeVariants.colors': exchange.requestProduct.colors,
            },
            {
              $inc: {
                'sizeVariants.$.amount': -exchange.requestProduct.amount,
              },
            },
            { session },
          ),
          this.productModel.updateOne(
            {
              _id: exchange.receiveProduct.receiverProductId,
              'sizeVariants.size': exchange.receiveProduct.size,
              'sizeVariants.colors': exchange.receiveProduct.colors,
            },
            {
              $inc: {
                'sizeVariants.$.amount': -exchange.receiveProduct.amount,
              },
            },
            { session },
          ),
        ]);

        const updateExchangedStatus = async (productUpdate, productId) => {
          if (
            productUpdate.sizeVariants.every((variant) => variant.amount === 0)
          ) {
            await this.productModel.updateOne(
              { _id: productId },
              { $set: { status: 'Exchanged' } },
              { session },
            );
          }
        };

        await Promise.all([
          updateExchangedStatus(
            requesterProductUpdate,
            exchange.requestProduct.requesterProductId,
          ),
          updateExchangedStatus(
            receiverProductUpdate,
            exchange.receiveProduct.receiverProductId,
          ),
        ]);

        // Send notification to the requester
        const product = await this.productModel
          .findById(exchange.requestProduct.requesterProductId)
          .lean();
        if (product) {
          this.eventGateway.sendAuthenticatedNotification(
            exchange.requesterId.toString(),
            `Giao dịch cho sản phẩm"${product.productName}" đã được chấp nhận.`,
          );
        }
      } else if (status === 'rejected') {
        exchange.allExchangeStatus = 'rejected';

        // Send notification to the requester
        const product = await this.productModel
          .findById(exchange.requestProduct.requesterProductId)
          .lean();
        product.status = 'active';
        if (product) {
          this.eventGateway.sendAuthenticatedNotification(
            exchange.requesterId.toString(),
            `Giao dịch cho sản phẩm '${product.productName}' đã bị từ chối.`
          );          
        }
      } else {
        throw new BadRequestException('Invalid status');
      }

      await exchange.save({ session });
      await session.commitTransaction();

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
    const session = await this.exchangeModel.db.startSession();
    session.startTransaction();
  
    try {
      // Tải lại tài liệu để đảm bảo dữ liệu mới nhất
      let exchange = await this.exchangeModel
        .findById(exchangeId)
        .populate('requesterId', 'firstname lastname')
        .populate('receiverId', 'firstname lastname')
        .session(session);
  
      if (!exchange) {
        throw new BadRequestException('Exchange not found');
      }
  
      if (exchange.allExchangeStatus !== 'accepted') {
        throw new BadRequestException('Exchange status is not accepted');
      }
  
      // Xác định vai trò của người dùng (requester hoặc receiver)
      const isRequester = (exchange.requesterId as any)._id.toString() === userId;
      const isReceiver = (exchange.receiverId as any)._id.toString() === userId;
  
      if (!isRequester && !isReceiver) {
        throw new BadRequestException('You are not the requester or receiver');
      }
  
      // Cập nhật trạng thái tương ứng với vai trò của người dùng
      if (isRequester) {
        exchange.requestStatus.exchangeStatus = status;
      } else if (isReceiver) {
        exchange.receiverStatus.exchangeStatus = status;
      }
  
      // Kiểm tra riêng cho trạng thái "canceled"
      if (status === 'canceled') {
        if (isRequester) {
          // Chỉ cho phép requester hủy khi receiver vẫn đang ở trạng thái pending
          if (exchange.receiverStatus.exchangeStatus !== ShippingStatusE.pending) {
            throw new BadRequestException('Receiver is not pending');
          }
        } else if (isReceiver) {
          // Chỉ cho phép receiver hủy khi requester vẫn đang ở trạng thái pending
          if (exchange.requestStatus.exchangeStatus !== ShippingStatusE.pending) {
            throw new BadRequestException('Requester is not pending');
          }
        }
  
        // Nếu điều kiện thỏa mãn, cập nhật trạng thái "canceled" chỉ 2 bên
       exchange.receiverStatus.exchangeStatus = 'canceled';
       
  
        // Đưa sản phẩm về trạng thái ban đầu (ví dụ: khôi phục số lượng)
        await Promise.all([
          this.productModel.updateOne(
            {
              _id: exchange.requestProduct.requesterProductId,
              'sizeVariants.size': exchange.requestProduct.size,
              'sizeVariants.colors': exchange.requestProduct.colors,
            },
            {
              $inc: {
                'sizeVariants.$.amount': exchange.requestProduct.amount,
              },
              status: 'active',
            },
            { session },
          ),
          this.productModel.updateOne(
            {
              _id: exchange.receiveProduct.receiverProductId,
              'sizeVariants.size': exchange.receiveProduct.size,
              'sizeVariants.colors': exchange.receiveProduct.colors,
            },
            {
              $inc: {
                'sizeVariants.$.amount': exchange.receiveProduct.amount,
              },
            },
            { session },
          ),
        ]);
  
        exchange.allExchangeStatus = 'canceled';
      }
  
      // Xử lý trạng thái hoàn thành, chỉ cập nhật confirmStatus của bên còn lại
      if (status === 'completed') {
        if (isRequester) {
          exchange.requestStatus.exchangeStatus = status;
          exchange.receiverStatus.confirmStatus = 'pending';
        } else if (isReceiver) {
          exchange.receiverStatus.exchangeStatus = status;
          exchange.requestStatus.confirmStatus = 'pending';
        }
      }
  
      // Lưu trạng thái cập nhật và commit giao dịch
      await exchange.save({ session });
      await session.commitTransaction();
  
      const product = await this.productModel
        .findById(exchange.requestProduct.requesterProductId)
        .lean();
  
      const updatingUser = isRequester
        ? (exchange.requesterId as any).firstname +
          ' ' +
          (exchange.requesterId as any).lastname
        : (exchange.receiverId as any).firstname +
          ' ' +
          (exchange.receiverId as any).lastname;
  
      // Tạo thông báo với tên đầy đủ của người dùng
      const notificationMessage = `Giao dịch cho sản phẩm '${product?.productName}' đã được cập nhật thành '${status}' bởi người dùng ${updatingUser}.`;
      console.log(notificationMessage)
      // Gửi thông báo cho bên còn lại
      const otherPartyId = isRequester
        ? (exchange.receiverId as any)._id
        : (exchange.requesterId as any)._id;
  
      console.log('Sending notification to:', otherPartyId);
      await this.eventGateway.sendAuthenticatedNotification(
        otherPartyId.toString(),
        notificationMessage,
      );
  
      return exchange.toObject();
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException(
        error.message || 'Failed to update exchange status',
      );
    } finally {
      session.endSession();
    }
  }
  
  


  async updateExchangeConfirmStatusService(
    userId: string,
    exchangeId: string,
    confirmStatus: string,
  ): Promise<any> {
    const session = await this.exchangeModel.db.startSession();
    session.startTransaction();

    try {
      const exchange = await this.exchangeModel
        .findById(exchangeId)
        .populate('requesterId', 'firstname lastname') // Populate requesterId to get the name
        .populate('receiverId', 'firstname lastname')
        .session(session);

      if (!exchange) {
        throw new BadRequestException('Exchange not found');
      }
      if(
        exchange.allExchangeStatus !== 'accepted'
      ){
        throw new BadRequestException('Exchange status is not accepted')
      }

      // Ensure that the user is either the requester or the receiver
      const isRequester =
        (exchange.requesterId as any)._id.toString() === userId;
      const isReceiver = (exchange.receiverId as any)._id.toString() === userId;
      if (!isRequester && !isReceiver) {
        throw new BadRequestException('You are not the requester or receiver');
      }

      // Determine if the user is the requester or receiver and update confirmStatus
      if (isRequester) {
        exchange.requestStatus.confirmStatus = confirmStatus;
        exchange.receiverStatus.statusDate = new Date()
      } else {
        exchange.receiverStatus.confirmStatus = confirmStatus;
        exchange.receiverStatus.statusDate = new Date()
      }

      // If both parties confirm, mark the exchange as completed
      if (
        exchange.requestStatus.confirmStatus === 'confirmed' &&
        exchange.receiverStatus.confirmStatus === 'confirmed'
      ) {
        exchange.allExchangeStatus = 'completed';
        exchange.completedAt = new Date();
      }

      // Save the exchange status and commit transaction
      await exchange.save({ session });
      await session.commitTransaction();

      const product = await this.productModel
        .findById(exchange.requestProduct.requesterProductId)
        .lean();

      const updatingUser = isRequester
        ? (exchange.requesterId as any).firstname +
          ' ' +
          (exchange.requesterId as any).lastname
        : (exchange.receiverId as any).firstname +
          ' ' +
          (exchange.receiverId as any).lastname;

      // Create the notification message with the user's full name
      const notificationMessage = `Giao dịch cho sản phẩm '${product?.productName}' đã được xác nhận bởi người dùng ${updatingUser}.`;

      // Send notification to the other party about the status update
      const otherPartyId = isRequester
        ? exchange.receiverId
        : exchange.requesterId;
      console.log('Sending notification to:', (otherPartyId as any)._id);
      await this.eventGateway.sendAuthenticatedNotification(
        (otherPartyId as any)._id.toString(),
        notificationMessage,
      );
      return exchange.toObject();
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException(
        error.message || 'Failed to update exchange status',
      );
    }
  }

  //************************ manage */
  async getListExchangeForManageService(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ total: number; data: any[] }> {
    const total = await this.exchangeModel.countDocuments();
    const listExchange = await this.exchangeModel
      .find()
      .populate('requesterId', 'firstname lastname email')
      .populate('receiverId', 'firstname lastname email')
      .populate('requestProduct.requesterProductId', 'productName')
      .populate('receiveProduct.receiverProductId', 'productName')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  
    // Sử dụng Promise.all để lấy đánh giá của mỗi giao dịch trong listExchange song song
    const dataWithRatings = await Promise.all(
      listExchange.map(async (exchange) => {
        const requesterRating = await this.ratingModel.findOne({
          userId: exchange.requesterId,
          targetId: exchange._id,
          targetType: 'exchange',
        }).lean();
  
        const receiverRating = await this.ratingModel.findOne({
          userId: exchange.receiverId,
          targetId: exchange._id,
          targetType: 'exchange',
        }).lean();
  
        return {
          ...exchange,
          ratings: {
            requesterRating: requesterRating || null,
            receiverRating: receiverRating || null,
          },
        };
      })
    );
  
    return {
      total,
      data: dataWithRatings,
    };
  }
  
}
