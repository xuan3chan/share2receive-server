import * as https from 'https';
import * as crypto from 'crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Configs, ConfigsDocument, Order, OrderItem, Packet, Product, SubOrder, User, UserDocument, Wallet, WalletDocument } from '@app/libs/common/schema';
import { Model } from 'mongoose';
import { IMomoPaymentResponse } from '@app/libs/common/interface';
import { TransactionService } from 'src/transaction/transaction.service';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(SubOrder.name) private subOrderModel: Model<SubOrder>,
    @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Packet.name) private packetModel: Model<Packet>,
    @InjectModel(Configs.name) private ConfigsModel: Model<ConfigsDocument>,
    private transactionService: TransactionService,
    private walletService: WalletService,
  ) {
  }
  private async getPerPoint() {
    const result = await this.ConfigsModel.findOne().select('valueToPoint').lean();
    return result.valueToPoint;
  }

  async checkoutByWalletService(userId: string, orderID: string): Promise<any> {
    const perPoint = await this.getPerPoint();
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
    if (myOrder.paymentStatus === 'paid') {
      throw new BadRequestException('Đơn hàng đã được thanh toán!');
    }
    if (myOrder.totalAmount <= 0) {
      throw new BadRequestException('Tổng số tiền thanh toán không hợp lệ!');
    }
    if (myOrder.subOrders.length === 0) {
      throw new BadRequestException('Không có sản phẩm nào trong đơn hàng!');
    }

    // Kiểm tra đơn giá của từng sản phẩm
    for (const subOrderId of myOrder.subOrders) {
      const subOrder = await this.subOrderModel
        .findById(subOrderId)
        .populate('products');
      for (const productItem of subOrder.products) {
        const orderItem = await this.orderItemModel
          .findById(productItem)
          .lean();
        if (!orderItem) {
          throw new BadRequestException(
            `Sản phẩm không tồn tại: ${productItem}`,
          );
        }

        const product = await this.productModel
          .findById(orderItem.productId)
          .lean();
        if (!product) {
          throw new BadRequestException(
            `Sản phẩm không tồn tại: ${orderItem.productId}`,
          );
        }

        // Tìm size và màu cụ thể trong sizeVariants
        const sizeVariant = product.sizeVariants.find(
          (variant) =>
            variant.size === orderItem.size &&
            variant.colors === orderItem.color,
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
    if (myOrder.totalAmount > 50000) {
      throw new BadRequestException(
        'Tổng số tiền thanh toán phải nhỏ hơn 50000 để thanh toán bằng ví.')
    }
    // Trừ tiền từ ví người dùng
    const userWallet = await this.walletService.getWalletService(userId);
    if (userWallet.point < myOrder.totalAmount / perPoint) {
      throw new BadRequestException('Số dư ví không đủ để thanh toán!');
    }

    await this.walletService.deductPointService(userId, myOrder.totalAmount / perPoint,'checkout');

    // Cập nhật trạng thái thanh toán
    await this.orderModel.findByIdAndUpdate(orderID, {
      paymentStatus: 'paid',
      type: 'point_wallet',
    });

    return { message: 'Thanh toán bằng ví thành công' };
  }
  async checkoutByAgreementService(
    userId: string,
    orderID: string,
  ): Promise<any> {
    const order = await this.orderModel.findOne({ _id: orderID, userId });
    if (!order) {
      throw new BadRequestException('Đơn hàng không tồn tại!');
    }
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Đơn hàng đã được thanh toán!');
    }

    // Cập nhật trạng thái thanh toán
    await this.orderModel.findByIdAndUpdate(orderID, {
      paymentStatus: 'PayPickup',
      type: 'agreement',
    });
    return { message: 'Thành công khi thanh toán khi nhận hàng' };
  }
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
        const subOrder = await this.subOrderModel
          .findById(subOrderId)
          .populate('products');
        for (const productItem of subOrder.products) {
          const orderItem = await this.orderItemModel
            .findById(productItem)
            .lean();
          if (!orderItem) {
            throw new BadRequestException(
              `Sản phẩm không tồn tại: ${productItem}`,
            );
          }

          const product = await this.productModel
            .findById(orderItem.productId)
            .lean();
          if (!product) {
            throw new BadRequestException(
              `Sản phẩm không tồn tại: ${orderItem.productId}`,
            );
          }

          // Tìm size và màu cụ thể trong sizeVariants
          const sizeVariant = product.sizeVariants.find(
            (variant) =>
              variant.size === orderItem.size &&
              variant.colors === orderItem.color,
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
      await this.orderModel.findByIdAndUpdate(orderID, {
        paymentStatus: 'pending',
        type: 'momo_wallet',
      });
      // Lấy danh sách sản phẩm từ các `subOrders`
      const items = (
        await Promise.all(
          myOrder.subOrders.flatMap(async (subOrderId: any) => {
            const subOrder = await this.subOrderModel
              .findById(subOrderId)
              .populate('products');
            return Promise.all(
              subOrder.products.map(async (product: any) => {
                // Truy vấn dữ liệu sản phẩm từ `productModel`
                const productData = await this.productModel
                  .findById(product.productId) // `product.productId` là ObjectId
                  .select('imgUrls productName price')
                  .lean();

                if (!productData) {
                  throw new BadRequestException(
                    `Không tìm thấy sản phẩm với ID: ${product.productId}`,
                  );
                }

                return {
                  id: product.productId.toString(), // Lấy ID từ `productId` dưới dạng chuỗi
                  name: productData.productName,
                  price: product.price, // Giá sản phẩm
                  currency: 'VND',
                  quantity: product.quantity, // Số lượng sản phẩm
                  imageUrl: productData.imgUrls?.[0] || '', // Ảnh đầu tiên hoặc chuỗi rỗng
                  totalPrice: product.price * product.quantity, // Tổng giá trị
                };
              }),
            );
          }),
        )
      ).flat(); // Loại bỏ cấp độ mảng lồng nhau

      const config = {
        accessKey: 'F8BBA842ECF85',
        secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
        partnerCode: 'MOMO',
        redirectUrl: 'https://shop.share2receive.io.vn/orders-management',
        ipnUrl:
          process.env.MOMO_IPN_URL ||
          'https://share2receive-server.onrender.com/api/checkout/callback/momo',
        requestType: 'payWithMethod',
        lang: 'vi',
      };

      const orderInfo =
        'Thanh toán đơn hàng của bạn - ' +
        (myOrder.subOrders as any[])
          .map((subOrder) => subOrder.subOrderUUID.toString())
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
                new BadRequestException(
                  'Không thể phân tích phản hồi từ MoMo.',
                ),
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
    const perPoint = await this.getPerPoint();

    console.log('Callback từ MoMo:', body);
    //kiểm tra orderInfo có chữ 'Thanh toán đơn hàng của bạn'
    const orderInfo = body.orderInfo;
    const checkInfo = orderInfo.includes('Thanh toán đơn hàng của bạn');
    if (checkInfo) {
      if (body.resultCode === 0) {
        console.log('Thanh toán thành công cho đơn hàng:', body.orderId);
        await this.updateOrderStatus(body.extraData, 'paid', body);
      } else {
        console.error('Thanh toán thất bại:', body.message);
        await this.updateOrderStatus(body.extraData, 'failed', body);
        throw new BadRequestException(body.message);
      }
    }else if (orderInfo.includes('Nạp')) {
      if (body.resultCode === 0) {
        console.log('Nạp tiền vào ví thành công:', body.orderId);
        await this.transactionService.saveTransaction(body.extraData, body);
        await this.walletService.addPointService(body.extraData, body.amount / perPoint);///// cân điểm nạp
      } else {
        console.error('Nạp tiền vào ví thất bại:', body.message);
        throw new BadRequestException(body.message);
      }
    }else if (orderInfo.includes('Thanh toán gói nạp')) {
      if (body.resultCode === 0) {
        console.log('Thanh toán gói nạp thành công:', body.orderId);
        
        // Lưu giao dịch vào cơ sở dữ liệu
        await this.transactionService.saveTransaction(body.extraData, body);
        
        // Trích xuất số điểm nạp từ orderInfo
        const pointsMatch = orderInfo.match(/với điểm (\d+)/);
        const promotionPointMatch = orderInfo.match(/đã cộng (\d+)/);  // Trích xuất promotionPoint
    
        if (pointsMatch && pointsMatch[1]) {
          const pointsToAdd = parseInt(pointsMatch[1], 10);
          const promotionPoint = promotionPointMatch && promotionPointMatch[1] 
                                 ? parseInt(promotionPointMatch[1], 10)
                                 : 0;  // Nếu không có promotionPoint, gán 0
          console.log(`Số điểm nạp: ${pointsToAdd}`);
          console.log(`Số điểm khuyến mãi đã cộng: ${promotionPoint}`);
          
          // Thêm điểm vào ví người dùng
          const realPoints = pointsToAdd - promotionPoint;
          await this.walletService.addPointService(body.extraData, realPoints,promotionPoint);
        } else {
          console.error('Không tìm thấy số điểm trong orderInfo:', orderInfo);
          throw new BadRequestException('Không tìm thấy thông tin số điểm trong giao dịch');
        }
      } else {
        console.error('Thanh toán gói nạp thất bại:', body.message);
        throw new BadRequestException(body.message);
      }
    }
    
    
    


    return { message: 'Callback từ MoMo đã được xử lý thành công.' };
  }

  private async updateOrderStatus(
    orderId: string,
    status: string,
    body: IMomoPaymentResponse,
  ) {
    const order = await this.orderModel.findOne({ _id: orderId });
    const userId = order.userId;
    const saveTran = await this.transactionService.saveTransaction(
      userId,
      body,
      orderId,
    );
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
          const orderItem = await this.orderItemModel
            .findById(productItem)
            .lean();
          if (!orderItem) {
            throw new BadRequestException(
              `Sản phẩm không tồn tại: ${productItem}`,
            );
          }

          const product = await this.productModel
            .findById(orderItem.productId)
            .lean();
          if (!product) {
            throw new BadRequestException(
              `Sản phẩm không tồn tại: ${orderItem.productId}`,
            );
          }

          // Tìm size và màu cụ thể trong sizeVariants
          const sizeVariant = product.sizeVariants.find(
            (variant) =>
              variant.size === orderItem.size &&
              variant.colors === orderItem.color,
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
          const orderItem = await this.orderItemModel
            .findById(productItem)
            .lean();
          const product = await this.productModel.findById(orderItem.productId);

          if (product) {
            const sizeVariantIndex = product.sizeVariants.findIndex(
              (variant) =>
                variant.size === orderItem.size &&
                variant.colors === orderItem.color,
            );

            if (sizeVariantIndex !== -1) {
              // Cập nhật tồn kho
              product.sizeVariants[sizeVariantIndex].amount -=
                orderItem.quantity;

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
  ///////////////////
  async momoPaymentPoint(userId: string, pointsToAdd: number): Promise<any> {
    try {
      const perPoint = await this.getPerPoint();
      if (pointsToAdd <= 0) {
        throw new BadRequestException('Số điểm phải lớn hơn 0');
      }

      // Thông tin giao dịch, bao gồm các thông số của MoMo API
      const config = {
        accessKey: 'F8BBA842ECF85',
        secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
        partnerCode: 'MOMO',
        redirectUrl: 'https://shop.share2receive.io.vn/', // URL redirect sau khi thanh toán
        ipnUrl:
          process.env.MOMO_IPN_URL ||
          'https://share2receive-server.onrender.com/api/checkout/callback/momo', // URL callback
        requestType: 'payWithMethod',
        lang: 'vi',
      };
      const nameUser = await this.userModel.findById(userId).select('firstname lastname').lean();
      const orderInfo = `Nạp ${pointsToAdd} điểm vào ví của người dùng ${nameUser.firstname} ${nameUser.lastname}`;
      const extraData = userId;
      const autoCapture = true;

      const amount = pointsToAdd * perPoint; // Giả sử 1 điểm = 1000 VND

      // Tạo orderId và requestId cho MoMo
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

      // Tạo payload gửi đến MoMo API
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
      });
      
      // Gửi yêu cầu tới MoMo API
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
                // Nếu thành công, trả về URL thanh toán MoMo
                resolve({response});
              } else {
                reject(
                  new BadRequestException(
                    `Lỗi khi tạo thanh toán: ${response.message}`,
                  ),
                );
              }
            } catch (error) {
              reject(
                new BadRequestException(
                  'Không thể phân tích phản hồi từ MoMo.',
                ),
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
      throw new InternalServerErrorException(error.message);
    }
  }

async checkoutPacketService(userId: string, packetId: string): Promise<any> {
  const perPoint = await this.getPerPoint();
  const packet = await this.packetModel.findById(packetId).lean();
  if (!packet) {
    throw new BadRequestException('Gói không tồn tại!');
  }

  
  const amount = packet.price;
  const pointsToAdd = amount / perPoint + packet.promotionPoint;
  const config = {
    accessKey: 'F8BBA842ECF85',
    secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    partnerCode: 'MOMO',
    redirectUrl: 'https://shop.share2receive.io.vn/',
    ipnUrl:
      process.env.MOMO_IPN_URL ||
      'https://share2receive-server.onrender.com/api/checkout/callback/momo',
    requestType: 'payWithMethod',
    lang: 'vi',
  };

  const nameUser = await this.userModel.findById(userId).select('firstname lastname').lean();
  const orderInfo = `Thanh toán gói nạp ${packet.name} với điểm ${pointsToAdd}(đã cộng ${packet.promotionPoint}) vào ví của người dùng ${nameUser.firstname} ${nameUser.lastname}`;
  const extraData = userId;
  const autoCapture = true;

  const orderId = config.partnerCode + new Date().getTime();
  const requestId = orderId;

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
  });

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
            new BadRequestException(
              'Không thể phân tích phản hồi từ MoMo.',
            ),
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
}
}
