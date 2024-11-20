import * as https from 'https';
import * as crypto from 'crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cart, Order, OrderItem, Product, SubOrder } from '@app/libs/common/schema';
import { Model } from 'mongoose';
import { IMomoPaymentResponse } from '@app/libs/common/interface';
import { TransactionService } from 'src/transaction/transaction.service';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(SubOrder.name) private subOrderModel: Model<SubOrder>,
    @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
    private transactionService: TransactionService,
  ) {}

  // MoMo payment
  async momoPayment(userId: string, orderID: string): Promise<any> {
    try {
      // Lấy thông tin đơn hàng
      const myOrder = await this.orderModel
        .findOne({ _id: orderID, userId })
        .populate({
          path: 'subOrders',
          populate: [
            {
              path: 'products',
              model: 'OrderItem', // Model của `OrderItem`
              populate: {
                path: 'productId',
                model: 'Product', // Model của `Product`
              },
            },
          ],
        });
  
      if (!myOrder) {
        throw new BadRequestException('Đơn hàng không tồn tại!');
      }
      if (myOrder.paymentStatus == 'paid') {
        throw new BadRequestException('Đơn hàng không hợp lệ!');
      }
      if (myOrder.totalAmount <= 0) {
        throw new BadRequestException('Tổng số tiền thanh toán không hợp lệ!');
      }
      if (myOrder.subOrders.length === 0) {
        throw new BadRequestException('Không có sản phẩm nào trong đơn hàng!');
      }
  
      // Kiểm tra tồn kho trước khi tạo giao dịch
      for (const subOrderId of myOrder.subOrders) {
        const subOrder = await this.subOrderModel.findById(subOrderId).populate('products');
        for (const productItem of subOrder.products) {
          const orderItem = await this.orderItemModel.findById(productItem).lean();
          if (!orderItem) {
            throw new BadRequestException(`Sản phẩm không tồn tại: ${productItem}`);
          }
  
          const product = await this.productModel.findById(orderItem.productId).lean();
          if (!product) {
            throw new BadRequestException(
              `Sản phẩm không tồn tại: ${orderItem.productId}`,
            );
          }
  
          // Tìm size và màu cụ thể trong sizeVariants
          const sizeVariant = product.sizeVariants.find(
            (variant) =>
              variant.size === orderItem.size && variant.colors === orderItem.color,
          );
  
          if (!sizeVariant) {
            throw new BadRequestException(
              `Không tìm thấy phiên bản sản phẩm (size: ${orderItem.size}, màu: ${orderItem.color}).`,
            );
          }
  
          // Kiểm tra tồn kho
          if (sizeVariant.amount < orderItem.quantity) {
            throw new BadRequestException(
              `Sản phẩm '${product.productName}' (size: ${orderItem.size}, màu: ${orderItem.color}) không đủ hàng.`,
            );
          }
        }
      }
  
      // Lấy danh sách sản phẩm từ các `subOrders`
      const items = (myOrder.subOrders as any[]).flatMap((subOrder) =>
        (subOrder.products as any[]).map((product) => ({
          id: product.productId.toString(),
          name: product.productName,
          price: product.price,
          currency: 'VND',
          quantity: product.quantity,
          imageUrl: product.imgUrls || '', // Bổ sung đường dẫn ảnh nếu có
          totalPrice: product.price * product.quantity,
        })),
      );
  
      const config = {
        accessKey: 'F8BBA842ECF85',
        secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
        partnerCode: 'MOMO',
        redirectUrl: 'https://share2receive-client.vercel.app/',
        ipnUrl: process.env.MOMO_IPN_URL,
        requestType: 'payWithMethod',
        lang: 'vi',
      };
  
      const orderInfo =
        'Thanh toán đơn hàng của bạn - ' +
        (myOrder.subOrders as any[])
          .map((subOrder) => subOrder.orderUUID.toString())
          .join(', ');
  
      const extraData = orderID;
      const autoCapture = true;
  
      // Tổng số tiền thanh toán
      const amount = myOrder.totalAmount;
      // Tạo orderId và requestId
      const orderId = config.partnerCode + new Date().getTime();
      const requestId = orderId;
  
      // Tạo chữ ký (signature)
      const rawSignature = [
        `accessKey=${config.accessKey}`,
        `amount=${amount}`,
        `extraData=${extraData}`,
        `ipnUrl=${config.ipnUrl}`,
        `orderId=${orderId}`,
        `orderInfo=${orderInfo}`,
        `partnerCode=${config.partnerCode}`,
        `redirectUrl=${config.redirectUrl}`,
        `requestId=${requestId}`,
        `requestType=${config.requestType}`,
      ].join('&');
  
      const signature = crypto
        .createHmac('sha256', config.secretKey)
        .update(rawSignature)
        .digest('hex');
  
      // Tạo payload gửi tới MoMo
      const requestBody = JSON.stringify({
        partnerCode: config.partnerCode,
        partnerName: 'Share2Receive',
        storeId: 'MomoStore',
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl: config.redirectUrl,
        ipnUrl: config.ipnUrl,
        lang: config.lang,
        requestType: config.requestType,
        autoCapture,
        extraData,
        signature,
        items,
      });
  
      // Gửi yêu cầu đến MoMo
      const options = {
        hostname: 'test-payment.momo.vn',
        port: 443,
        path: '/v2/gateway/api/create',
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
                resolve({ response });
              } else {
                reject(
                  new BadRequestException(
                    `Lỗi khi tạo thanh toán: ${response.message}`,
                  ),
                );
              }
            } catch (error) {
              reject(
                new BadRequestException('Không thể phân tích phản hồi từ MoMo.'),
              );
            }
          });
        });
  
        req.on('error', (e) => {
          reject(
            new InternalServerErrorException(
              `Lỗi kết nối đến MoMo: ${e.message}`,
            ),
          );
        });
  
        req.write(requestBody);
        req.end();
      });
    } catch (error) {
      console.error('Lỗi trong quá trình tạo thanh toán với MoMo:', error);
      throw new BadRequestException(error.message);
    }
  }
  
  

  async momoCallbackService(body: IMomoPaymentResponse): Promise<any> {
    console.log('Callback từ MoMo:', body);
    if (body.resultCode === 0) {
      console.log('Thanh toán thành công cho đơn hàng:', body.orderId);
      await this.updateOrderStatus(body.extraData, 'paid',body);
    } else {
      console.error('Thanh toán thất bại:', body.message);
      await this.updateOrderStatus(body.extraData, 'failed',body);
      throw new BadRequestException(body.message);
    }
  
    return { message: 'Callback từ MoMo đã được xử lý thành công.' };
  }
  
  private async updateOrderStatus(
    orderId: string,
    status: string,
    body: IMomoPaymentResponse,
  ) {
    const order = await this.orderModel.findOne(
        { _id: orderId },
    );
    const userId = order.userId;
    const saveTran = await this.transactionService.saveTransaction(orderId,userId,body)
    //update order status and save transactionId
    await this.orderModel.findByIdAndUpdate(orderId, {
      paymentStatus: status,
      transactionId: saveTran._id,
    });

    if (!order) {
      throw new BadRequestException('Đơn hàng không tồn tại!');
    }
  
    if (status === 'paid') {
      const subOrders = await this.subOrderModel.find({ orderId });
  
      for (const subOrder of subOrders) {
        for (const productItem of subOrder.products) {
          const orderItem = await this.orderItemModel.findById(productItem).lean();
          if (!orderItem) {
            throw new BadRequestException(`Sản phẩm không tồn tại: ${productItem}`);
          }
  
          const product = await this.productModel.findById(orderItem.productId).lean();
          if (!product) {
            throw new BadRequestException(
              `Sản phẩm không tồn tại: ${orderItem.productId}`,
            );
          }
  
          // Tìm size và màu cụ thể trong sizeVariants
          const sizeVariant = product.sizeVariants.find(
            (variant) =>
              variant.size === orderItem.size && variant.colors === orderItem.color,
          );
  
          if (!sizeVariant) {
            throw new BadRequestException(
              `Không tìm thấy phiên bản sản phẩm (size: ${orderItem.size}, màu: ${orderItem.color}).`,
            );
          }
  
          // Kiểm tra tồn kho
          if (sizeVariant.amount < orderItem.quantity) {
            // Nếu hết hàng, hoàn tác trạng thái thanh toán
            await this.orderModel.findByIdAndUpdate(orderId, {
              paymentStatus: 'failed',
            });
            throw new BadRequestException(
              `Sản phẩm "${product.productName}" (size: ${orderItem.size}, màu: ${orderItem.color}) không đủ hàng.`,
            );
          }
        }
      }
  
      // Nếu tất cả sản phẩm đủ hàng, cập nhật tồn kho và thông tin bán
      for (const subOrder of subOrders) {
        for (const productItem of subOrder.products) {
          const orderItem = await this.orderItemModel.findById(productItem).lean();
          const product = await this.productModel.findById(orderItem.productId);
  
          if (product) {
            const sizeVariantIndex = product.sizeVariants.findIndex(
              (variant) =>
                variant.size === orderItem.size && variant.colors === orderItem.color,
            );
  
            if (sizeVariantIndex !== -1) {
              // Cập nhật tồn kho
              product.sizeVariants[sizeVariantIndex].amount -= orderItem.quantity;
  
              // Lưu lại thay đổi
              await product.save();
              console.log(product);
            }
  
            // Cập nhật số lượng đã bán
            await this.productModel.updateOne(
              { _id: product._id },
              { $inc: { sold: orderItem.quantity } },
            );
          }
        }
      }
    }
  }
  
 

  

}
