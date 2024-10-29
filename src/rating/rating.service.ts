import { Injectable, BadRequestException } from '@nestjs/common';
import { RatingDocument, ExchangeDocument } from '@app/libs/common/schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateRatingDto } from '@app/libs/common/dto';

@Injectable()
export class RatingService {
  constructor(
    @InjectModel('Rating') private readonly ratingModel: Model<RatingDocument>,
    @InjectModel('User') private readonly userModel: Model<RatingDocument>,
    @InjectModel('Product') private readonly productModel: Model<RatingDocument>,
    @InjectModel('Exchange') private readonly exchangeModel: Model<ExchangeDocument>,
  ) {}

  async createRatingService(
    userId: string,
    createRatingDto: CreateRatingDto,
  ): Promise<RatingDocument> {
    const { targetType, targetId, rating, comment } = createRatingDto;

    if (targetType === 'Product') {
      const product = await this.productModel.findById(targetId);
      if (!product) {
        throw new Error('Product not found');
      }
      if (product.userId === userId) {
        throw new Error('You cannot rate your own product');
      }
    } else if (targetType === 'exchange') {
      const exchange = await this.exchangeModel.findById(targetId).lean();
      if (!exchange) {
        throw new Error('Exchange not found');
      }

      // Kiểm tra trạng thái hoàn thành trước khi cho phép đánh giá
      if ((exchange as ExchangeDocument).allExchangeStatus !== 'completed') {
        throw new BadRequestException(
          'Cannot rate this exchange before it is completed',
        );
      }

      // Kiểm tra xem user là requester hay receiver trong giao dịch này
      const isRequester = (exchange as any).requesterId.toString() === userId;
      const isReceiver = exchange.receiverId.toString() === userId;
      if (!isRequester && !isReceiver) {
        throw new BadRequestException('You are not a participant in this exchange');
      }

      // Kiểm tra xem user đã đánh giá chưa
      const existingRating = await this.ratingModel.findOne({
        userId,
        targetId,
        targetType: 'exchange',
      });
      if (existingRating) {
        throw new BadRequestException('You have already rated this exchange');
      }
    }

    const createdRating = new this.ratingModel({
      userId,
      targetId,
      targetType,
      rating,
      comment,
    });
    return createdRating.save();
  }

  async getRatingForExchangeService(
    userId: string,
    targetId: string,
  ): Promise<{
    userRole: string;
    requesterRating?: RatingDocument;
    receiverRating?: RatingDocument;
  }> {
    // Tìm exchange để xác định vai trò của userId trong đó
    const exchange = await this.exchangeModel.findById(targetId).lean();
    if (!exchange) {
      throw new BadRequestException('Exchange not found');
    }

    // Kiểm tra vai trò của userId trong exchange (requester hoặc receiver)
    let userRole = '';
    if (exchange.requesterId.toString() === userId) {
      userRole = 'requester';
    } else if (exchange.receiverId.toString() === userId) {
      userRole = 'receiver';
    } else {
      throw new BadRequestException(
        'You are not a participant in this exchange',
      );
    }

    // Lấy đánh giá của cả requester và receiver cho giao dịch này
    const requesterRating = await this.ratingModel.findOne({
      userId: exchange.requesterId,
      targetId,
      targetType: 'exchange',
    });

    const receiverRating = await this.ratingModel.findOne({
      userId: exchange.receiverId,
      targetId,
      targetType: 'exchange',
    });

    // Trả về kết quả với thông tin vai trò của userId, và đánh giá của requester/receiver (nếu có)
    return {
      userRole,
      requesterRating: requesterRating || null, // Đánh giá của requester (nếu có)
      receiverRating: receiverRating || null,   // Đánh giá của receiver (nếu có)
    };
  }
}
