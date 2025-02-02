import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet, WalletDocument } from '@app/libs/common/schema';
import { User, UserDocument } from '@app/libs/common/schema';
import mongoose from 'mongoose';
import { RevenueService } from 'src/revenue/revenue.service';

@Injectable()
export class WalletService implements OnModuleInit {
    constructor(
        @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        private readonly revenueService: RevenueService,
    ) {}
    async addPointForOutService(userId: string, amount: number): Promise<WalletDocument> {
        try {
            // Kiểm tra ví người dùng
            let wallet = await this.walletModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
            if (!wallet) {
                // Tạo ví mới nếu chưa có
                wallet = new this.walletModel({
                    userId: new mongoose.Types.ObjectId(userId),
                    point: amount,
                });
            } else {
                // Cập nhật điểm vào ví hiện có
                wallet.point += amount;
            }
            // Lưu ví lại vào cơ sở dữ liệu
            await wallet.save();
            await this.revenueService.createRevenue(userId, 'out', amount, 'promotion');
            return wallet;
        } catch (error) {
            throw new BadRequestException(`Error adding points: ${error.message}`);
        }
    }
    // Thêm điểm vào ví của người dùng
    async addPointService(userId: string, amount: number, extra?:number): Promise<WalletDocument> {
        try {
            // Kiểm tra ví người dùng
            let wallet = await this.walletModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
            if (!wallet) {
                // Tạo ví mới nếu chưa có
                wallet = new this.walletModel({
                    userId: new mongoose.Types.ObjectId(userId),
                    point: amount,
                });
            } else {
                // Cập nhật điểm vào ví hiện có
                wallet.point += amount;
            }
            // Lưu ví lại vào cơ sở dữ liệu
            await wallet.save();
            await this.revenueService.createRevenue(userId, 'out', amount, 'sale');
            if (extra) {
                await this.revenueService.createRevenue(userId, 'out', extra, 'promotion');
            }
            return wallet;
        } catch (error) {
            throw new BadRequestException(`Error adding points: ${error.message}`);
        }
    }
    async deductPointService(userId: string, amount: number,type?:string): Promise<WalletDocument> {
        try {
            // Kiểm tra
            const wallet = await this.walletModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
            if (!wallet) {
                throw new BadRequestException('Wallet not found');
            }
            
            // Kiểm tra số điểm còn lại
            if (wallet.point < amount) {
                throw new BadRequestException('Not enough points');
            }
            // Trừ điểm
            wallet.point -= amount;
            // Lưu lại vào cơ sở dữ liệu
            await wallet.save();
            if(type === 'checkout'){
            await this.revenueService.createRevenue(userId, 'in', amount, 'buy');
            }else if(type === 'cross') {
            await this.revenueService.createRevenue(userId, 'in', amount, 'product');

            }
            return wallet;
        } catch (error) {
            throw new BadRequestException(`Error deducting points: ${error.message}`);
        }
    }
    // Lấy thông tin ví của người dùng
    async getWalletService(userId: string): Promise<WalletDocument> {
        try {
            // Kiểm tra ví người dùng
            const wallet = await this.walletModel.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
            if (!wallet) {
                throw new BadRequestException('Wallet not found');
            }
            return wallet;
        } catch (error) {
            throw new BadRequestException(`Error retrieving wallet: ${error.message}`);
        }
    }
    // Kiểm tra ví của người dùng, tạo mới nếu chưa tồn tại
    async checkWallet(userId: string): Promise<WalletDocument> {
        try {
            let wallet = await this.walletModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
            if (!wallet) {
                wallet = new this.walletModel({
                    userId: new mongoose.Types.ObjectId(userId),
                    point: 5,
                });
                await wallet.save();
            }
            return wallet;
        } catch (error) {
            throw new BadRequestException(`Error checking wallet: ${error.message}`);
        }
    }
    async createWalletService(userId: string): Promise<WalletDocument> {
        try {
            // Tạo ví mới
            const wallet = new this.walletModel({
                userId: new mongoose.Types.ObjectId(userId),
                point: 5,
            });
            // Lưu ví vào cơ sở dữ liệu
            await wallet.save();
            return wallet;
        } catch (error) {
            throw new BadRequestException(`Error creating wallet: ${error.message}`);
        }
    }

    // Hàm khởi tạo ví cho tất cả người dùng khi module khởi động
    async onModuleInit() {
        await this.initializeWalletsForAllUsers();
    }

    // Khởi tạo ví cho tất cả người dùng trong hệ thống
    async initializeWalletsForAllUsers(): Promise<void> {
        try {
            // Lấy tất cả người dùng
            const users = await this.userModel.find();
            for (const user of users) {
                // Kiểm tra ví cho từng người dùng
                const wallet = await this.walletModel.findOne({ userId: user._id });
                if (!wallet) {
                    // Tạo ví mới nếu người dùng chưa có ví
                    await this.checkWallet(user._id.toString());
                }
            }
        } catch (error) {
            throw new BadRequestException(`Error initializing wallets for all users: ${error.message}`);
        }
    }
    
}
