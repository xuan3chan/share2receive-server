import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Order, Transaction } from '@app/libs/common/schema';
import { IMomoPaymentResponse } from '@app/libs/common/interface';
import * as https from 'https';
import * as crypto from 'crypto';
import { path } from '@ffmpeg-installer/ffmpeg';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  async saveTransaction(
    orderS2RId: string,
    userId: string,
    data: IMomoPaymentResponse,
  ): Promise<Transaction> {
    try {
      console.log(`Saving transaction for user ${userId}`);
      const transactionData: any = { orderS2RId, userId, ...data };
      const transaction = new this.transactionModel(transactionData);
      const savedTransaction = await transaction.save();
      return savedTransaction;
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw new BadRequestException(error.message);
    }
  }
  async checkTransactionStatus(orderId: string): Promise<any> {
    const config = {
      accessKey: 'F8BBA842ECF85',
      secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
      partnerCode: 'MOMO',
    };

    const requestId = `${config.partnerCode}${Date.now()}`;
    const rawSignature = `accessKey=${config.accessKey}&orderId=${orderId}&partnerCode=${config.partnerCode}&requestId=${requestId}`;
    const signature = crypto
      .createHmac('sha256', config.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = JSON.stringify({
      partnerCode: config.partnerCode,
      requestId,
      orderId,
      signature,
      lang: 'vi',
    });

    const options = {
      hostname: 'test-payment.momo.vn',
      port: 443,
      path: '/v2/gateway/api/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.resultCode === 0) {
              resolve(response);
            } else {
              reject(
                new Error(`Lỗi khi kiểm tra giao dịch: ${response.message}`),
              );
            }
          } catch (error) {
            reject(new Error('Không thể phân tích phản hồi từ MoMo.'));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(`Lỗi kết nối đến MoMo: ${e.message}`));
      });

      req.write(requestBody);
      req.end();
    });
  }

  async checkTransactionIsPaid(
    userId: string,
    orderS2RId: string,
  ): Promise<any> {
    try {
      const transaction = await this.transactionModel.findOne({
        orderS2RId: orderS2RId,
        userId: userId,
      });

      if (!transaction) {
        throw new BadRequestException('Không tìm thấy giao dịch phù hợp.');
      }

      // Kiểm tra trạng thái giao dịch từ MoMo
      const checkStatus = await this.checkTransactionStatus(
        transaction.orderId,
      );

      if (checkStatus.resultCode === 0) {
        const updatedOrder = await this.orderModel.findOneAndUpdate(
          { _id: orderS2RId },
          { $set: { paymentStatus: 'paid', TransactionId: transaction._id } },
          { new: true },
        );

        if (!updatedOrder) {
          throw new BadRequestException('Không tìm thấy đơn hàng để cập nhật.');
        }

        return { message: 'Giao dịch đã được thanh toán', order: updatedOrder };
      } else {
        console.error(`Giao dịch không thành công: ${checkStatus.message}`);
        return {
          status: 'failed',
          message: `Giao dịch không thành công: ${checkStatus.message}`,
        };
      }
    } catch (error) {
      console.error('Lỗi trong quá trình kiểm tra giao dịch:', error);
      throw new BadRequestException(error.message);
    }
  }
  async refundTransaction(orderS2RId: string): Promise<any> {
    const config = {
      accessKey: 'F8BBA842ECF85',
      secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
      partnerCode: 'MOMO',
    };
  
    const transaction = await this.transactionModel.findOne({ orderS2RId });
  
    if (!transaction) {
      throw new BadRequestException('Không tìm thấy giao dịch phù hợp.');
    }
    const orderId = config.partnerCode + new Date().getTime();
    const {  amount, transId } = transaction;
    const description = ''; // Giữ trống nếu không có mô tả
  
    const requestId = `${config.partnerCode}${Date.now()}`;
    const rawSignature = `accessKey=${config.accessKey}&amount=${amount}&description=${description}&orderId=${orderId}&partnerCode=${config.partnerCode}&requestId=${requestId}&transId=${transId}`;
    
    const signature = crypto
      .createHmac('sha256', config.secretKey)
      .update(rawSignature)
      .digest('hex');
  
    const requestBody = JSON.stringify({
      partnerCode: config.partnerCode,
      requestId,
      orderId,
      amount,
      transId,
      description,
      signature,
      lang: 'vi',
    });
  
    const options = {
      hostname: 'test-payment.momo.vn',
      port: 443,
      path: '/v2/gateway/api/refund',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };
    await this.transactionModel.findOneAndUpdate(
        { orderS2RId },
        { $set: { status: 'refunded' } },
        { new: true },
        );
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
  
        res.on('data', (chunk) => {
          data += chunk;
        });
  
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.resultCode === 0) {
              resolve(response);
            } else {
              reject(
                new BadRequestException(
                  `Lỗi hoàn tiền: ${response.message}`,
                ),
              );
            }
          } catch (error) {
            reject(new Error('Không thể phân tích phản hồi từ MoMo.'));
          }
        });
      });
  
      req.on('error', (e) => {
        reject(new Error(`Lỗi kết nối đến MoMo: ${e.message}`));
      });
  
      req.write(requestBody);
      req.end();
    });
  }
  
  
}
