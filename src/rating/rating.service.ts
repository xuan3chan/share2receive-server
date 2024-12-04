import { Injectable, BadRequestException } from '@nestjs/common';
import { RatingDocument, ExchangeDocument,UserDocument, SubOrderDocument } from '@app/libs/common/schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateRatingDto } from '@app/libs/common/dto';

@Injectable()
export class RatingService {
  constructor(
    @InjectModel('Rating') private readonly ratingModel: Model<RatingDocument>,
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
    @InjectModel('SubOrder') private readonly subOrderModel: Model<SubOrderDocument>,
    @InjectModel('Exchange') private readonly exchangeModel: Model<ExchangeDocument>,
  ) {}

  async createRatingService(
    userId: string,
    createRatingDto: CreateRatingDto,
  ): Promise<RatingDocument> {
    try {
      const { targetType, targetId, rating, comment } = createRatingDto;
  
      if (targetType === 'sale') {
        const subOrder = await this.subOrderModel.findById(targetId).lean();
        if (!subOrder) throw new BadRequestException('subOrder not found');
  
        // Check if the user has already rated this product
        const existingRating = await this.ratingModel.findOne({
          userId,
          targetId,
          targetType: 'sale',
        });
        if (existingRating) throw new BadRequestException('You have already rated this product');

        // Create and save the new rating
        const createdRating = new this.ratingModel({
          userId,
          targetId,
          targetType,
          rating,
          targetUserId: subOrder.sellerId,
          comment,
        });
        const user = await this.userModel.findById(subOrder.sellerId) as  UserDocument;

        if (!user) throw new BadRequestException('User not found');
        const newNumberOfRatings = (user.numberOfRating || 0) + 1;

        const newAverageRating = ((user.averageRating * (user.numberOfRating || 0)) + rating) / newNumberOfRatings;
        await Promise.all([
          createdRating.save(),
          this.userModel.findByIdAndUpdate(subOrder.sellerId, {
            averageRating: newAverageRating,
            numberOfRating: newNumberOfRatings,
          }, { new: true })
        ]);
        return createdRating;
        // Update the product's average rating and rating count
      } else if (targetType === 'exchange') {
        const exchange = await this.exchangeModel.findById(targetId).lean();
        if (!exchange) throw new BadRequestException('Exchange not found')
  
        // Determine if the user is the requester or receiver
        const isRequester = exchange.requesterId.toString() === userId;
        const ratedUserId = isRequester ? exchange.receiverId : exchange.requesterId;
  
        if (!isRequester && exchange.receiverId.toString() !== userId) {
          throw new BadRequestException('You are not a participant in this exchange');
        }
  
        // Check if the user's confirm status is "confirmed"
        const userConfirmStatus = isRequester
          ? exchange.requestStatus.confirmStatus
          : exchange.receiverStatus.confirmStatus;
        if (userConfirmStatus !== 'confirmed') {
          throw new BadRequestException('Your confirm status must be "confirmed" to rate this exchange');
        }
  
        // Check if the other party has completed their status
        const otherPartyStatus = isRequester
          ? exchange.receiverStatus.exchangeStatus
          : exchange.requestStatus.exchangeStatus;
        if (otherPartyStatus !== 'completed') {
          throw new BadRequestException('Cannot rate: The other party must have completed the exchange');
        }
  
        // Check if the user has already rated this exchange
        const existingRating = await this.ratingModel.findOne({
          userId,
          targetId,
          targetType: 'exchange',
        });
        if (existingRating) throw new BadRequestException('You have already rated this exchange');
  
        // Create and save the new rating
        const createdRating = new this.ratingModel({
          userId,
          targetId,
          targetType,
          targetUserId: ratedUserId,
          rating,
          comment,
        });
  
        // Update the rated user's average rating and rating count
        const user = await this.userModel.findById(ratedUserId) as UserDocument;
        if (!user) throw new BadRequestException('User not found');
  
        const newNumberOfRatings = (user.numberOfRating || 0) + 1;
        const newAverageRating = ((user.averageRating * (user.numberOfRating || 0)) + rating) / newNumberOfRatings;
  
        // Use Promise.all to save the rating and update the user rating data simultaneously
        await Promise.all([
          createdRating.save(),
          this.userModel.findByIdAndUpdate(ratedUserId, {
            averageRating: newAverageRating,
            numberOfRating: newNumberOfRatings,
          }, { new: true })
        ]);
  
        return createdRating;
      }
      
      throw new BadRequestException('Invalid target for rating');
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create rating');
    }
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
  //get detail rating for sale
  async getRatingForSaleService(
    userId: string,
    targetId: string,
  ): Promise<any> {
    const rating = await this.ratingModel.findOne({
      userId,
      targetId,
      targetType: 'sale',
    });
    if (!rating) throw new BadRequestException('Rating not found');
    
    const subOrder = await this.subOrderModel.findById(rating.targetId).populate('sellerId').lean();
    if (!subOrder) throw new BadRequestException('SubOrder not found');
    
    const seller = await this.userModel.findById(subOrder.sellerId).select('firstname lastname').lean();
    if (!seller) throw new BadRequestException('Seller not found');
    
    // thêm thông tin người bán vào rating data ra
    return {
      ...rating.toObject(),
      seller,
    };
  }
  // get all rating of user
  async getAllRatingService(userId: string): Promise<RatingDocument[]> {
    return this.ratingModel.find
    ({
      targetUserId: userId,
    }).lean();
  }
}
