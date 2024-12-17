import { BadRequestException, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Revenue, RevenueDocument } from '@app/libs/common/schema';

@Injectable()
export class RevenueService {
    constructor(
        @InjectModel(Revenue.name) private readonly revenueModel: Model<RevenueDocument>,
    ) {}
    async createRevenue(userId: string,type:string, amount: number, description: string): Promise<RevenueDocument> {
        const revenue = new this.revenueModel({
            userId,
            amount,
            type,
            description,
        });
        return revenue.save();
    }
    async getAllRevenue(
        page: number = 1, 
        limit: number = 10, 
        filterBy?: string, 
        filterValue?: string
    ): Promise<any> {
        try {
            // Điều kiện tìm kiếm (lọc)
            const filter: any = {};
            if (filterBy && filterValue) {
                filter[filterBy] = filterValue; // Lọc theo field filterBy
            }
    
            // Tổng số lượng bản ghi thỏa mãn điều kiện lọc
            const totalRevenue = await this.revenueModel.countDocuments(filter);
    
            // Tính tổng doanh thu toàn bộ dữ liệu (không áp dụng filter)
            const overallSummarize = await this.revenueModel.aggregate([
                {
                    $group: {
                        _id: null, // Bắt buộc phải có _id
                        totalSale: { $sum: { $cond: [{ $regexMatch: { input: "$description", regex: "sale", options: "i" } }, '$amount', 0] } },
                        totalBuy: { $sum: { $cond: [{ $regexMatch: { input: "$description", regex: "buy", options: "i" } }, '$amount', 0] } },
                        totalPromotion: { $sum: { $cond: [{ $regexMatch: { input: "$description", regex: "promotion", options: "i" } }, '$amount', 0] } },
                        totalProduct: { $sum: { $cond: [{ $regexMatch: { input: "$description", regex: "product", options: "i" } }, '$amount', 0] } },
                    },
                },
                { $project: { _id: 0 } } // Loại bỏ _id khỏi kết quả trả về
            ]);
    
            const overallSummary = overallSummarize[0] || { totalSale: 0, totalBuy: 0, totalPromotion: 0, totalProduct: 0 };
    
            // Phân trang: skip và limit
            const skip = (page - 1) * limit;
    
            // Lấy dữ liệu từ MongoDB với phân trang và lọc
            const revenues = await this.revenueModel
                .find(filter) // Áp dụng bộ lọc
                .populate('userId', 'email') // Lấy thông tin user
                .select('-updatedAt -__v') // Loại bỏ các trường không cần thiết
                .skip(skip) // Bỏ qua các bản ghi đã xem
                .limit(limit) // Giới hạn số lượng bản ghi trả về
                .exec();
    
            // Tính tổng số trang
            const totalPages = Math.ceil(totalRevenue / limit);
    
            // Trả về dữ liệu với phân trang và tổng kết toàn bộ
            return {
                data: revenues,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalRevenue: totalRevenue,
                },
                summarize: overallSummary // Tổng kết toàn bộ dữ liệu
            };
        } catch (error) {
            console.error('Error fetching revenues:', error);
            throw new BadRequestException('Error fetching revenues');
        }
    }
    
    
    
    
    
    
    


}
