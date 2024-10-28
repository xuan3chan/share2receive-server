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

  async getListExchangeService(userId: string): Promise<any[]> {
    const listExchange = await this.exchangeModel
      .find({
        $or: [{ requesterId: userId }, { receiverId: userId }],
      })
      .populate('requesterId', 'firstname lastname avatar email')
      .populate('receiverId', 'firstname lastname avatar email')
      .populate('requestProduct.requesterProductId', 'productName imgUrls')
      .populate('receiveProduct.receiverProductId', 'productName imgUrls')
      .lean(); // Dùng lean() để trả về plain objects thay vì Mongoose documents
    // Tái cấu trúc dữ liệu để xác định vai trò của userId
    const structuredExchanges = listExchange.map((exchange) => ({
      ...exchange, // Sao chép tất cả các thuộc tính của exchange
      role:
        (exchange.requesterId as any)._id.toString() === userId
          ? 'requester'
          : 'receiver', // Xác định vai trò
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
            `Giao dịch cho sản phẩm"${product.productName}" đã bị từ chối.`,
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
      console.log(error);
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
      // Reload the document to ensure up-to-date data
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
  
      // Ensure that the user is either the requester or the receiver
      const isRequester =
        (exchange.requesterId as any)._id.toString() === userId;
      const isReceiver = (exchange.receiverId as any)._id.toString() === userId;
      if (!isRequester && !isReceiver) {
        throw new BadRequestException('You are not the requester or receiver');
      }
  
      // Determine if the user is the requester or receiver and update status
      let otherPartyId;
      if (isRequester) {
        exchange.requestStatus.exchangeStatus = status;
        otherPartyId = exchange.receiverId;
      } else {
        exchange.receiverStatus.exchangeStatus = status;
        otherPartyId = exchange.requesterId;
      }
  
      // Reload the exchange document within the transaction to ensure latest data
      exchange = await this.exchangeModel
        .findById(exchangeId)
        .session(session);
      // Confirm both statuses are "pending" before allowing cancellation
      if (status === 'canceled') {
        if (
          exchange.receiverStatus.exchangeStatus !== ShippingStatusE.pending ||
          exchange.requestStatus.exchangeStatus !== ShippingStatusE.pending
        ) {

          throw new BadRequestException('Both parties are not pending');
        }
  
        // Set both statuses to "canceled"
        exchange.receiverStatus.exchangeStatus = 'canceled';
        exchange.requestStatus.exchangeStatus = 'canceled';
  
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
  
      // Handle completion status, setting confirmStatus for the opposite party
      if (status === 'completed') {
        if (isRequester) {
          exchange.receiverStatus.exchangeStatus = status;
          exchange.requestStatus.confirmStatus = 'pending';
        } else {
          exchange.requestStatus.exchangeStatus = status;
          exchange.receiverStatus.confirmStatus = 'pending';
        }
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
      const notificationMessage = `Giao dịch cho sản phẩm "${product?.productName}" đã được cập nhật thành "${status}" bởi người dùng ${updatingUser}.`;
  
      // Send notification to the other party about the status update
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
      const notificationMessage = `Giao dịch cho sản phẩm "${product?.productName}" đã được xác nhận bởi người dùng ${updatingUser}.`;

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
}
