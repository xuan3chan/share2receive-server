import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Order,
  SubOrder,
  OrderItem,
  Product,
  Cart,
  User,
  Rating,
} from '@app/libs/common/schema';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  CreateOrderByProductDto,
  RequestRefundDto,
} from '@app/libs/common/dto/order.dto';
import { TransactionService } from 'src/transaction/transaction.service';
import { EventGateway } from '@app/libs/common/util/event.gateway';
import { MailerService } from 'src/mailer/mailer.service';
import { IShipping } from '@app/libs/common/interface';
@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(SubOrder.name) private subOrderModel: Model<SubOrder>,
    @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Rating.name) private ratingModel: Model<Rating>,
    private EventGateway: EventGateway,
    private mailerService: MailerService,
    private transactionService: TransactionService,
  ) {}

  async createOrderService(userId: string): Promise<any> {
    
    const shippingServices: Record<string, IShipping> = {
      GHN: {
        name: 'GHN',
        intraProvince: {
          mass: 3, // kg
          fee: 15000,
          more: 2500,
        },
        interProvince: {
          mass: 0.5, // kg
          fee: 29000,
          more: 5000,
        },
      },
      GHTK: {
        name: 'GHTK',
        intraProvince: {
          mass: 3, // kg
          fee: 22000,
          more: 2500,
        },
        interProvince: {
          mass: 0.5, // kg
          fee: 30000,
          more: 2500,
        },
      },
    };
    const cartItems = await this.cartModel
      .find({ userId, isCheckedOut: false })
      .populate('productId') // Populate to get product info
      .populate('userId', 'address phone');

    if (cartItems.length === 0) {
      throw new BadRequestException('Không có sản phẩm nào trong giỏ hàng!');
    }

    const groupedBySeller = cartItems.reduce((result, item) => {
      const sellerId = (item.productId as any).userId.toString(); // sellerId of the product
      if (!result[sellerId]) {
        result[sellerId] = [];
      }
      result[sellerId].push(item);
      return result;
    }, {});

    const subOrders = [];
    for (const [sellerId, items] of Object.entries(groupedBySeller) as [
      string,
      any[],
    ][]) {
      const orderItems = await Promise.all(
        items.map(async (item) => {
          return await this.orderItemModel.create({
            subOrderId: null, // Will be updated later
            productId: item.productId._id,
            productName: item.productId.productName,
            quantity: item.amount,
            price: item.price,
            size: item.size,
            color: item.color,
          });
        }),
      );

      const subTotal = items.reduce(
        (sum, item) => sum + item.price * item.amount,
        0,
      );

      const buyerAddress = (cartItems[0].userId as any).address;
      const sellerAddress = await this.userModel
        .findById(items[0].productId.userId)
        .select('address')
        .lean();
      const totalWeight = items.reduce(
        (sum, item) => sum + item.productId.weight * item.amount,
        0,
      ); // Calculate total weight

      const isIntraProvince = this.compareLastPartOfAddress(
        buyerAddress,
        sellerAddress.address,
      );

      const shippingFee = this.calculateShippingFee(
        shippingServices['GHN'],
        totalWeight,
        isIntraProvince,
      );
      const subOrder = await this.subOrderModel.create({
        orderId: null, // Will be updated later
        sellerId,
        subTotal,
        products: orderItems.map((item) => item._id),
        shippingService: 'GHN', // Default shipping service
        shippingFee,
      });
      console.log('Shipping Fee:', shippingFee);
      await this.orderItemModel.updateMany(
        { _id: { $in: orderItems.map((item) => item._id) } },
        { $set: { subOrderId: subOrder._id } },
      );

      subOrders.push(subOrder);
    }

    const totalAmount = subOrders.reduce(
      (sum, subOrder) => sum + subOrder.subTotal + subOrder.shippingFee,
      0,
    );
    console.log('Total Amount:', totalAmount);
    const order = await this.orderModel.create({
      userId,
      phone: (cartItems[0].userId as any).phone,
      address: (cartItems[0].userId as any).address,
      totalAmount,
      paymentStatus: 'pending',
      TransactionId: null,
      subOrders: subOrders.map((subOrder) => subOrder._id),
    });

    await this.subOrderModel.updateMany(
      { _id: { $in: subOrders.map((subOrder) => subOrder._id) } },
      { $set: { orderId: order._id } },
    );

    await this.cartModel.updateMany(
      { _id: { $in: cartItems.map((item) => item._id) } },
      { $set: { isCheckedOut: true } },
    );

    for (const sellerId of Object.keys(groupedBySeller)) {
      const sellerItems = groupedBySeller[sellerId];
      const orderInfo = sellerItems
        .map(
          (item: any) =>
            `${item.productId.productName} ${item.size} ${item.color} ${item.amount} cái`,
        )
        .join(', ');

      const seller = await this.userModel.findById(sellerId).lean();
      const subOrder = await this.subOrderModel
        .findOne({ sellerId })
        .sort({ createdAt: -1 })
        .lean();

      if (seller && seller.email) {
        this.mailerService.sendEmailNewOrder(
          seller.email,
          subOrder.subOrderUUID,
          orderInfo,
        );
      }

      this.EventGateway.sendAuthenticatedNotification(
        sellerId,
        'Bạn có đơn hàng mới',
        'Bạn có đơn hàng mới vui lòng kiểm tra đơn bán của bạn',
      );
    }

    return { message: 'Đơn hàng được tạo thành công!', order };
  }

  async getOrdersService(orderId: string, userId: string): Promise<any> {
    const order = await this.orderModel
      .findOne({ _id: orderId, userId })
      .populate({
        path: 'subOrders',
        select: '-createdAt -updatedAt',
        populate: [
          {
            path: 'products',
            model: 'OrderItem',
            select: '-createdAt -updatedAt',
            populate: {
              path: 'productId',
              model: 'Product',
              select: 'imgUrls',
            },
          },
          {
            path: 'sellerId',
            model: 'User',
            select: 'firstname lastname address phone avatar email',
          },
        ],
      })
      .populate('userId', 'firstname lastname address phone avatar email');

    if (!order) {
      throw new BadRequestException(
        'Order not found or you do not have access to it.',
      );
    }

    // Tính toán `summary` và thêm `ratings`
    let totalAmount = 0;
    let totalPrice = 0;
    let totalShippingFee = 0;
    const uniqueProductIds = new Set<string>();

    const subOrdersWithRatings = await Promise.all(
      order.subOrders.map(async (subOrder: any) => {
        totalShippingFee += subOrder.shippingFee || 0;

        const productsWithRatings = await Promise.all(
          subOrder.products.map(async (product: any) => {
            totalAmount += product.quantity;
            totalPrice += product.quantity * product.price;

            if (product.productId) {
              uniqueProductIds.add(product.productId.toString());
            }

            // Lấy thông tin đánh giá (rating)
            const rating = await this.ratingModel.findOne({
              targetId: subOrder._id,
            });

            return {
              ...product.toObject(),
              rating: {
                rating: rating?.rating || null,
                comment: rating?.comment || null,
              },
            };
          }),
        );

        return {
          ...subOrder.toObject(),
          products: productsWithRatings,
        };
      }),
    );

    const totalTypes = uniqueProductIds.size;

    return {
      data: {
        ...order.toObject(),
        subOrders: subOrdersWithRatings,
      },
      summary: {
        totalAmount,
        totalTypes,
        totalPrice,
        totalShippingFee,
      },
    };
  }

  async updateInfoOrderService(
    orderId: string,
    userId: string,
    phone?: string,
    address?: string,
  ): Promise<any> {
    // Xây dựng đối tượng cập nhật dựa trên các giá trị hợp lệ
    const updateData: Record<string, any> = {};
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    // Kiểm tra nếu không có gì để cập nhật
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Không có thông tin nào để cập nhật.');
    }

    // Tìm và cập nhật đơn hàng
    const order = await this.orderModel.findOneAndUpdate(
      { _id: orderId, userId },
      updateData,
      { new: true },
    );

    if (!order) {
      throw new BadRequestException(
        'Đơn hàng không tồn tại hoặc không thuộc về người dùng này.',
      );
    }

    return { message: 'Cập nhật thông tin đơn hàng thành công!', order };
  }

  async createOrderByProductService(
    userId: string,
    createOrderByProductDto: CreateOrderByProductDto,
  ): Promise<any> {
    const { productId, quantity, size, color } = createOrderByProductDto;
    const product = await this.productModel
      .findOne({ _id: productId })
      .populate('userId', 'address phone');
    if (!product) {
      throw new BadRequestException('Sản phẩm không tồn tại');
    }
    // nếu sản phẩm của người bán thì không thể mua
    if (product.userId.toString() === userId) {
      throw new BadRequestException('Không thể mua sản phẩm của chính mình');
    }
    const orderItem = await this.orderItemModel.create({
      subOrderId: null,
      productId: product._id,
      productName: product.productName,
      quantity,
      price: product.price,
      size,
      color,
    });
    const subOrder = await this.subOrderModel.create({
      orderId: null,
      sellerId: product.userId,
      subTotal: orderItem.price * orderItem.quantity,
      products: [orderItem._id],
    });
    await this.orderItemModel.updateMany(
      { _id: orderItem._id },
      { $set: { subOrderId: subOrder._id } },
    );
    //get address and phone of user
    const user = await this.userModel.findOne({ _id: userId }).lean();

    const order = await this.orderModel.create({
      userId,
      phone: user.phone || null,
      address: user.address || null,
      totalAmount: subOrder.subTotal,
      paymentStatus: 'pending',
      TransactionId: null,
      subOrders: [subOrder._id],
    });
    await this.subOrderModel.updateMany(
      { _id: subOrder._id },
      { $set: { orderId: order._id } },
    );
    //gui tin thong bao cho nguoi ban
    const userData = await this.userModel
      .findOne({ _id: product.userId })
      .lean();
    // lấy orderUUID của đơn hàng của seller
    const orderInfo =
      product.productName +
      ' ' +
      orderItem.size +
      ' ' +
      orderItem.color +
      ' ' +
      orderItem.quantity +
      ' cái';
    this.mailerService.sendEmailNewOrder(
      userData.email,
      subOrder.subOrderUUID,
      orderInfo,
    );
    this.EventGateway.sendAuthenticatedNotification(
      product.userId,
      'Bạn có đơn hàng mới',
      'Bạn có đơn hàng mới vui lòng kiểm tra đơn bán của bạn',
    );
    await Promise.all(
      order.subOrders.map(async (subOrderId) => {
        await this.updateShippingService(subOrderId.toString(), 'GHN');
      }),
    );
    return { message: 'Đơn hàng được tạo thành công!', order };
  }
  async getOrdersByUserService(
    userId: string,
    paymentStatus?: string,
    dateFrom?: Date,
    dateTo?: Date,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: string | 'desc' = 'desc',
    searchKey?: string,
  ): Promise<any> {
    const query: any = { userId };

    // Lọc theo trạng thái thanh toán
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Lọc theo khoảng thời gian
    if (dateFrom && dateTo) {
      const dateToObj = new Date(dateTo);
      dateToObj.setHours(23, 59, 59, 999); // Đảm bảo bao gồm hết ngày
      query.createdAt = { $gte: dateFrom, $lte: dateToObj };
    }

    // Tìm kiếm không phân biệt dấu
    if (searchKey) {
      const normalizedSearchKey = searchKey
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      query.$or = [
        { orderUUID: { $regex: normalizedSearchKey, $options: 'i' } },
      ];
    }

    // Lấy danh sách orders cùng subOrders và user thông qua populate
    const orders = await this.orderModel
      .find(query)
      .populate({
        path: 'subOrders',
        select: '-createdAt -updatedAt',
        populate: [
          {
            path: 'products',
            model: 'OrderItem',
            select: '-createdAt -updatedAt',
            populate: {
              path: 'productId',
              model: 'Product',
              select: 'productName',
            },
          },
          {
            path: 'sellerId',
            model: 'User',
            select: 'firstname lastname address phone avatar email',
          },
        ],
      })
      .populate('userId', 'firstname lastname address phone avatar email')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Đếm tổng số đơn hàng
    const totalOrders = await this.orderModel.countDocuments(query);

    // Lấy ratings cho từng subOrder
    const mappedOrders = await Promise.all(
      orders.map(async (order) => {
        const subOrdersWithRatings = await Promise.all(
          order.subOrders.map(async (subOrderId) => {
            const subOrder = await this.subOrderModel
              .findById(subOrderId)
              .lean();
            const rating = await this.ratingModel.findOne({
              targetId: subOrderId,
            });
            return {
              ...subOrder,
              rating: {
                rating: rating?.rating || 0,
                comment: rating?.comment || '',
              },
            };
          }),
        );

        return {
          ...order.toObject(),
          subOrders: subOrdersWithRatings, // Cập nhật subOrders với thông tin rating
        };
      }),
    );

    // Trả về dữ liệu
    return {
      data: mappedOrders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
      },
    };
  }

  async cancelOrderService(orderId: string, userId: string): Promise<any> {
    // Tìm đơn hàng theo ID và userId
    const order = await this.orderModel.findOne({ _id: orderId, userId });
    if (!order) {
      throw new BadRequestException('Không tìm thấy đơn hàng để hủy');
    }

    // Kiểm tra trạng thái của các subOrders
    const subOrdersInShipping = await this.subOrderModel.find({
      _id: { $in: order.subOrders },
      status: 'shipping',
    });
    if (subOrdersInShipping.length > 0) {
      throw new BadRequestException('Không thể hủy đơn hàng đã được giao');
    }

    // Cập nhật trạng thái các subOrders thành "canceled"
    await this.subOrderModel.updateMany(
      { _id: { $in: order.subOrders } },
      { $set: { status: 'canceled' } },
    );

    // Nếu đơn hàng đã thanh toán, hoàn tiền và trả lại hàng vào kho
    if (order.paymentStatus === 'paid') {
      // Thực hiện hoàn tiền
      await this.transactionService.refundTransaction(orderId);

      // Tăng số lượng sản phẩm trong kho
      const subOrders = await this.subOrderModel
        .find({ _id: { $in: order.subOrders } })
        .populate({
          path: 'products',
          populate: {
            path: 'productId',
            model: 'Product',
          },
        });

      for (const subOrder of subOrders) {
        for (const productItem of subOrder.products) {
          // Truy vấn sản phẩm từ MongoDB
          const product = await this.productModel.findById(
            (productItem as any).productId,
          );
          if (!product) {
            throw new BadRequestException(
              `Không tìm thấy sản phẩm: ${(productItem as any).productId}`,
            );
          }

          // Tìm đúng size và màu để cập nhật tồn kho
          const sizeVariantIndex = product.sizeVariants.findIndex(
            (variant) =>
              variant.size === (productItem as any).size &&
              variant.colors === (productItem as any).color,
          );

          if (sizeVariantIndex !== -1) {
            // Tăng số lượng trong kho
            product.sizeVariants[sizeVariantIndex].amount += (
              productItem as any
            ).quantity;

            // Lưu thay đổi vào cơ sở dữ liệu
            await product.save();
          } else {
            throw new BadRequestException(
              `Không tìm thấy phiên bản sản phẩm (size: ${(productItem as any).size}, màu: ${(productItem as any).color}) cho sản phẩm: ${product.productName}`,
            );
          }
        }
      }
    }

    // Cập nhật trạng thái của đơn hàng
    await this.orderModel.findByIdAndUpdate(orderId, { status: 'canceled' });

    return { message: 'Đơn hàng đã được hủy' };
  }

  async getOrdersBySellerService(
    sellerId: string,
    dateFrom?: Date,
    dateTo?: Date,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: string | 'asc' | 'desc' = 'desc',
    searchKey?: string,
  ): Promise<any> {
    const query: any = { sellerId };
    // Lọc theo khoảng thời gian (nếu có)
    if (dateFrom) {
      query.createdAt = { $gte: dateFrom }; // Chỉ cần dateFrom nếu có
    }
    if (dateTo) {
      const dateToObj = new Date(dateTo);
      dateToObj.setHours(23, 59, 59, 999); // Đảm bảo bao gồm hết ngày
      query.createdAt = { ...query.createdAt, $lte: dateToObj };
    }

    // Tìm kiếm theo subOrderUUID hoặc mã sản phẩm nếu có searchKey
    if (searchKey) {
      const normalizedSearchKey = searchKey
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Xử lý tìm kiếm không phân biệt dấu
      console.log('Normalized Search Key:', normalizedSearchKey);

      query.$or = [
        { subOrderUUID: { $regex: normalizedSearchKey, $options: 'i' } }, // Tìm kiếm theo mã subOrderUUID
        {
          'products.productName': {
            $regex: normalizedSearchKey,
            $options: 'i',
          },
        }, // Tìm kiếm theo tên sản phẩm
      ];
    }

    // Kiểm tra và xử lý các tham số sortBy và sortOrder
    const validSortFields = [
      'createdAt',
      'paymentStatus',
      'totalAmount',
      'subOrderUUID',
      'subTotal',
      'status',
      'shippingFee',
    ]; // Các trường hợp hợp lệ cho sắp xếp
    if (!validSortFields.includes(sortBy)) {
      sortBy = 'createdAt'; // Nếu sortBy không hợp lệ, sử dụng mặc định
    }

    // Đảm bảo sortOrder hợp lệ
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      sortOrder = 'desc'; // Nếu sortOrder không hợp lệ, sử dụng mặc định
    }

    // Tạo truy vấn để lấy danh sách các đơn hàng
    const orders = await this.subOrderModel
      .find(query)
      .populate({
        path: 'orderId',
        select: 'paymentStatus address phone createdAt',
        populate: {
          path: 'userId',
          select: 'email firstname lastname',
        },
      })
      .populate({
        path: 'products',
        model: 'OrderItem',
        select: '-createdAt -updatedAt',
        populate: {
          path: 'productId',
          model: 'Product',
          select: 'imgUrls',
        },
      })
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 }) // Sắp xếp theo sortBy và sortOrder
      .skip((page - 1) * limit) // Phân trang
      .limit(limit); // Giới hạn số lượng kết quả trả về

    // Đếm tổng số đơn hàng để tính phân trang
    const totalOrders = await this.subOrderModel.countDocuments(query);

    // Lấy ratings cho từng subOrder
    const mappedOrders = await Promise.all(
      orders.map(async (order) => {
        const rating = await this.ratingModel.findOne({
          targetId: order._id,
        });
        return {
          ...order.toObject(),
          rating: {
            rating: rating?.rating || null,
            comment: rating?.comment || null,
          },
        };
      }),
    );

    // Trả về dữ liệu cùng với thông tin phân trang
    return {
      data: mappedOrders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
      },
    };
  }

  async updateSubOrderStatusService(
    sellerId: string,
    subOrderId: string,
    status: string,
  ): Promise<any> {
    // Kiểm tra subOrder thuộc về sellerId
    const subOrder = await this.subOrderModel
      .findOne({ _id: subOrderId, sellerId })
      .populate({
        path: 'orderId',
        select: 'userId',
        populate: {
          path: 'userId',
          model: 'User',
          select: 'email firstname lastname',
        },
      });

    if (!subOrder) {
      throw new BadRequestException(
        'Không tìm thấy SubOrder hoặc SubOrder không thuộc về sellerId',
      );
    }

    // Cập nhật trạng thái cho SubOrder
    subOrder.status = status;
    await subOrder.save();

    // Lấy thông tin người mua từ orderId
    const buyer = (subOrder.orderId as any).userId;
    if (!buyer) {
      throw new BadRequestException('Không tìm thấy thông tin người mua.');
    }

    // Gửi thông báo qua email và tin nhắn cho người mua
    const emailContent =
      status === 'canceled'
        ? 'Đơn hàng của bạn đã bị hủy. Vui lòng kiểm tra chi tiết trên ứng dụng.'
        : `Trạng thái đơn hàng của bạn đã được cập nhật thành: ${status}.`;
    const notificationContent =
      status === 'canceled'
        ? 'Đơn hàng của bạn đã bị hủy.'
        : `Trạng thái đơn hàng đã được cập nhật thành: ${status}.`;

    if (buyer.email) {
      await this.mailerService.sendEmailNotify(buyer.email, emailContent);
    }

    this.EventGateway.sendAuthenticatedNotification(
      buyer._id.toString(),
      'Cập nhật trạng thái đơn hàng',
      notificationContent,
    );

    // Xử lý logic dựa trên trạng thái mới
    if (status === 'canceled') {
      // Tìm danh sách sản phẩm thuộc SubOrder
      const products = await this.orderItemModel.find({ subOrderId });

      for (const product of products) {
        const productItem = await this.productModel.findById(product.productId);
        if (!productItem) {
          throw new BadRequestException(
            `Không tìm thấy sản phẩm: ${product.productId}`,
          );
        }

        // Tìm sizeVariant cần cập nhật
        const sizeVariantIndex = productItem.sizeVariants.findIndex(
          (variant) =>
            variant.size === product.size && variant.colors === product.color,
        );

        if (sizeVariantIndex !== -1) {
          // Cập nhật số lượng tồn kho
          productItem.sizeVariants[sizeVariantIndex].amount += product.quantity;
          await productItem.save();
        } else {
          throw new BadRequestException(
            `Không tìm thấy phiên bản sản phẩm (size: ${product.size}, màu: ${product.color}) cho sản phẩm: ${product.productName}`,
          );
        }
      }
    }

    return { message: 'Cập nhật trạng thái SubOrder thành công!', subOrder };
  }
  async deleteSubOrderService(
    subOrderId: string,
    userId: string,
  ): Promise<any> {
    // 1. Tìm Order chứa SubOrder cần xóa
    const order = await this.orderModel.findOne({
      subOrders: subOrderId,
      userId,
    });
    if (!order) {
      throw new BadRequestException(
        'Không tìm thấy Order liên quan đến SubOrder này',
      );
    }

    // 2. Xóa SubOrder khỏi mảng subOrders của Order
    const updateResult = await this.orderModel.updateOne(
      { _id: order._id },
      { $pull: { subOrders: subOrderId } },
    );

    if (updateResult.modifiedCount === 0) {
      throw new BadRequestException(
        'Không tìm thấy SubOrder hoặc không thuộc về userId',
      );
    }

    // 3. Kiểm tra nếu mảng subOrders trống, xóa luôn Order
    if (order.subOrders.length === 1) {
      // SubOrder bị xóa là phần tử cuối cùng, xóa Order
      await this.orderModel.deleteOne({ _id: order._id });
    } else {
      // Nếu còn SubOrders khác, cập nhật lại totalAmount
      const remainingSubOrders = await this.subOrderModel.find({
        _id: {
          $in: order.subOrders.filter((id) => id.toString() !== subOrderId),
        }, // Lọc bỏ subOrderId
      });

      const newTotalAmount = remainingSubOrders.reduce(
        (total, subOrder) => total + subOrder.subTotal,
        0,
      );

      await this.orderModel.updateOne(
        { _id: order._id },
        { $set: { totalAmount: newTotalAmount } },
      );
    }

    // 4. Tìm SubOrder cần xóa
    const subOrder = await this.subOrderModel.findOne({ _id: subOrderId });
    if (!subOrder) {
      throw new BadRequestException(
        'Không tìm thấy SubOrder hoặc không thuộc về sellerId',
      );
    }

    // 5. Kiểm tra trạng thái SubOrder
    if (subOrder.status === 'shipping') {
      throw new BadRequestException('Không thể xóa SubOrder đã được giao');
    }

    // 6. Xóa SubOrder
    await this.subOrderModel.deleteOne({ _id: subOrderId });

    // 7. Xóa các OrderItem thuộc SubOrder
    await this.orderItemModel.deleteMany({ subOrderId });

    // 8. Trả về thông báo thành công
    return { message: 'Xóa SubOrder và cập nhật Order thành công!' };
  }

  // xóa proudct item trong suborder
  async deleteOrderItemService(
    subOrderId: string,
    orderItemId: string,
  ): Promise<any> {
    // Kiểm tra SubOrder thuộc về userId
    const subOrder = await this.subOrderModel.findOne({
      _id: subOrderId,
    });
    if (!subOrder) {
      throw new BadRequestException(
        'Không tìm thấy SubOrder hoặc không thuộc về userId',
      );
    }
    if (subOrder.status === 'shipping') {
      throw new BadRequestException(
        'Không thể xóa OrderItem trong SubOrder đã được giao',
      );
    }

    // Kiểm tra OrderItem thuộc về SubOrder
    const orderItem = await this.orderItemModel.findOne({
      _id: orderItemId,
      subOrderId,
    });
    if (!orderItem) {
      throw new BadRequestException(
        'Không tìm thấy OrderItem hoặc không thuộc về SubOrder',
      );
    }

    // Xóa OrderItem
    await this.orderItemModel.deleteOne({ _id: orderItemId });

    // Kiểm tra còn OrderItem nào trong SubOrder
    const remainingOrderItems = await this.orderItemModel.find({ subOrderId });
    if (remainingOrderItems.length === 0) {
      // Nếu không còn OrderItem nào, xóa luôn SubOrder
      await this.subOrderModel.deleteOne({ _id: subOrderId });

      // Lấy Order chứa SubOrder này
      const order = await this.orderModel.findOne({ subOrders: subOrderId });
      if (!order) {
        throw new BadRequestException('Không tìm thấy Order liên quan');
      }

      // Cập nhật lại danh sách subOrders trong Order
      await this.orderModel.updateOne(
        { _id: order._id },
        { $pull: { subOrders: subOrderId } },
      );

      // Kiểm tra nếu không còn SubOrder nào trong Order
      const remainingSubOrders = await this.subOrderModel.find({
        _id: { $in: order.subOrders },
      });
      if (remainingSubOrders.length === 0) {
        // Nếu Order không còn SubOrder nào, xóa luôn Order
        await this.orderModel.deleteOne({ _id: order._id });

        return { message: 'Xóa OrderItem, SubOrder và Order thành công!' };
      }

      return { message: 'Xóa OrderItem và SubOrder thành công!' };
    }

    // Nếu còn OrderItem trong SubOrder, cập nhật lại subTotal
    const newSubTotal = remainingOrderItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    await this.subOrderModel.updateOne(
      { _id: subOrderId },
      { $set: { subTotal: newSubTotal } },
    );

    // Cập nhật lại totalAmount của Order chứa SubOrder
    const order = await this.orderModel.findOne({ subOrders: subOrderId });
    if (!order) {
      throw new BadRequestException('Không tìm thấy Order liên quan');
    }

    const updatedSubOrders = await this.subOrderModel.find({
      _id: { $in: order.subOrders },
    });
    const newTotalAmount = updatedSubOrders.reduce(
      (total, sub) => total + sub.subTotal,
      0,
    );

    await this.orderModel.updateOne(
      { _id: order._id },
      { $set: { totalAmount: newTotalAmount } },
    );

    return { message: 'Xóa OrderItem và cập nhật giá thành công!' };
  }

  async updateShippingService(
    subOrderId?: string,
    shippingService?: string,
    note?: string,
  ): Promise<any> {
    const subOrder = await this.subOrderModel
      .findOne({ _id: subOrderId })
      .populate('orderId')
      .populate('sellerId');

    if (!subOrder) {
      throw new BadRequestException('Không tìm thấy SubOrder');
    }

    // Kiểm tra trạng thái SubOrder
    if (subOrder.status === 'shipping') {
      throw new BadRequestException(
        'Không thể cập nhật dịch vụ vận chuyển cho SubOrder đã được giao',
      );
    }

    // Kiểm tra dịch vụ vận chuyển hợp lệ
    if (
      shippingService &&
      !['GHN', 'GHTK', 'agreement'].includes(shippingService)
    ) {
      throw new BadRequestException('Dịch vụ vận chuyển không hợp lệ');
    }

    const addressOfBuyer = (subOrder.orderId as any).address;
    const addressOfSeller = (subOrder.sellerId as any).address;

    if (!addressOfBuyer || !addressOfSeller) {
      console.log(addressOfBuyer, addressOfSeller);
      throw new BadRequestException('Không tìm thấy địa chỉ giao hàng');
    }

    // Cập nhật dịch vụ vận chuyển
    if (shippingService) {
      if (shippingService === 'agreement') {
        subOrder.shippingFee = 0;
      } else {
        const shippingServices: Record<string, IShipping> = {
          GHN: {
            name: 'GHN',
            intraProvince: {
              mass: 3, // kg
              fee: 15000,
              more: 2500,
            },
            interProvince: {
              mass: 0.5, // kg
              fee: 29000,
              more: 5000,
            },
          },
          GHTK: {
            name: 'GHTK',
            intraProvince: {
              mass: 3, // kg
              fee: 22000,
              more: 2500,
            },
            interProvince: {
              mass: 0.5, // kg
              fee: 30000,
              more: 2500,
            },
          },
        };

        const compare = this.compareLastPartOfAddress(
          addressOfBuyer,
          addressOfSeller,
        );
        const totalWeight = await this.calculateTotalWeight(subOrder.products);

        subOrder.shippingFee = this.calculateShippingFee(
          shippingServices[shippingService],
          totalWeight,
          compare,
        );
      }

      subOrder.shippingService = shippingService;
    }

    // Cập nhật note nếu có
    if (note !== undefined) {
      subOrder.note = note;
    }

    // Lưu SubOrder đã cập nhật
    await subOrder.save();

    // Cập nhật lại totalAmount của Order chứa SubOrder
    const order = await this.orderModel.findOne({ subOrders: subOrderId });
    if (!order) {
      throw new BadRequestException('Không tìm thấy Order liên quan');
    }

    const updatedSubOrders = await this.subOrderModel.find({
      _id: { $in: order.subOrders },
    });
    const newTotalAmount = updatedSubOrders.reduce(
      (total, sub) => total + sub.subTotal + sub.shippingFee,
      0,
    );
    await this.orderModel.updateOne(
      { _id: order._id },
      { $set: { totalAmount: newTotalAmount } },
    );

    return { message: 'Cập nhật dịch vụ vận chuyển thành công!' };
  }
  async requestRefundService(
    subOrderId: string,
    requestRefundDto: RequestRefundDto,
  ): Promise<any> {
    const {
      reason,
      bankingName,
      bankingNameUser,
      bankingNumber,
      bankingBranch,
    } = requestRefundDto;

    // Tìm SubOrder theo subOrderId
    const subOrder = await this.subOrderModel.findOne({ _id: subOrderId });
    if (!subOrder) {
      throw new BadRequestException('Không tìm thấy SubOrder');
    }

    // Kiểm tra trạng thái của SubOrder
    if (subOrder.status === 'canceled') {
      throw new BadRequestException(
        'Không thể yêu cầu hoàn tiền cho SubOrder đã bị hủy hoặc đã gửi',
      );
    }

    // Kiểm tra trạng thái thanh toán của Order
    const order = await this.orderModel.findOne({ subOrders: subOrderId });
    if (!order) {
      throw new BadRequestException('Không tìm thấy Order liên quan');
    }
    if (order.paymentStatus !== 'paid') {
      throw new BadRequestException(
        'Chỉ có thể yêu cầu hoàn tiền cho đơn hàng đã thanh toán',
      );
    }

    // Tạo yêu cầu hoàn tiền trong SubOrder
    subOrder.requestRefund = {
      reason,
      bankingName,
      bankingNameUser,
      bankingBranch,
      bankingNumber,
      createdAt: new Date(),
      status: 'pending', // Mặc định là pending khi yêu cầu được tạo
    };

    // Lưu lại SubOrder với thông tin yêu cầu hoàn tiền
    await subOrder.save();

    // Cập nhật trạng thái của Order (nếu cần thiết
    // Trả về kết quả sau khi tạo yêu cầu hoàn tiền thành công
    return {
      message: 'Yêu cầu hoàn tiền đã được tạo thành công',
      subOrder,
    };
  }
  async updateStatusForBuyerService(
    userId: string,
    subOrderId: string,
    status: string,
  ) {
    // Tìm SubOrder theo subOrderId
    const subOrder = await this.subOrderModel.findOne({ _id: subOrderId });
    if (!subOrder) {
      throw new BadRequestException('Không tìm thấy SubOrder');
    }
    if (subOrder.sellerId === userId) {
      throw new BadRequestException(
        'Bạn không thể xác nhận đã nhận hàng cho đơn hàng của mình',
      );
    }
    if (subOrder.status != 'delivered') {
      throw new BadRequestException(
        'Không thể cập nhật trạng thái cho SubOrder chưa được giao',
      );
    }
    subOrder.status = status;
    await subOrder.save();
    return { message: 'Cập nhật trạng thái SubOrder thành công!', subOrder };
  }
  //manage list suborder
  async getListSubOrderForManagerService(
    dateFrom?: Date,
    dateTo?: Date,
    page: number = 1,
    limit: number = 10,
    filterBy?: string,
    filterValue?: string,
    sortBy?: string,
    sortOrder: string | 'asc' | 'desc' = 'desc',
    searchKey?: string,
  ) {
    const query: any = {};

    // Lọc theo khoảng thời gian (nếu có)
    if (dateFrom) {
      query.createdAt = { $gte: dateFrom };
    }
    if (dateTo) {
      const dateToObj = new Date(dateTo);
      dateToObj.setHours(23, 59, 59, 999);
      query.createdAt = { ...query.createdAt, $lte: dateToObj };
    }

    // Tìm kiếm theo searchKey (nếu có)
    if (searchKey) {
      const normalizedSearchKey = searchKey
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      query.$or = [
        { subOrderUUID: { $regex: normalizedSearchKey, $options: 'i' } },
        {
          'products.productName': {
            $regex: normalizedSearchKey,
            $options: 'i',
          },
        },
      ];
    }

    // Lọc theo filterBy và filterValue
    if (filterBy && filterValue) {
      const validFields = Object.keys(this.subOrderModel.schema.paths);
      if (filterBy === 'requestRefund.status') {
        // Xử lý riêng cho requestRefund.status
        query['requestRefund.status'] = filterValue;
      } else if (validFields.includes(filterBy)) {
        query[filterBy] = filterValue;
      }
    }

    // Xử lý sortBy động
    const validSortFields = Object.keys(this.subOrderModel.schema.paths);
    if (!sortBy || !validSortFields.includes(sortBy)) {
      sortBy = 'createdAt'; // Mặc định
    }

    // Đảm bảo sortOrder hợp lệ
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      sortOrder = 'desc'; // Mặc định
    }

    // Lấy danh sách đơn hàng
    const orders = await this.subOrderModel
      .find(query)
      .populate({
        path: 'orderId',
        select: 'paymentStatus address phone createdAt',
        populate: {
          path: 'userId',
          select: 'email firstname lastname',
        },
      })
      .populate({
        path: 'products',
        model: 'OrderItem',
        select: '-createdAt -updatedAt',
        populate: {
          path: 'productId',
          model: 'Product',
          select: 'imgUrls',
        },
      })
      .populate('sellerId', 'email firstname lastname address phone')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalOrders = await this.subOrderModel.countDocuments(query);

    // Lấy đánh giá
    const ratings = await Promise.all(
      orders.map(async (order) => {
        return await this.ratingModel.findOne({ targetId: order._id });
      }),
    );

    const mappedOrders = orders.map((order) => {
      const rating = ratings.find(
        (r) => r && r.targetId.toString() === order._id.toString(),
      );
      return {
        ...order.toObject(),
        rating: rating ? rating.rating : null,
        comment: rating ? rating.comment : null,
      };
    });
    return {
      data: mappedOrders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
      },
    };
  }

  async updateStatusForRefunds(subOrderIds: string[], status: string) {
    // Kiểm tra trạng thái cho SubOrder đã được hoàn tiền chưa
    const subOrders = await this.subOrderModel.find({
      _id: { $in: subOrderIds },
      'requestRefund.status': { $ne: 'refunded' }, // Đảm bảo trạng thái không phải là "refunded"
    });

    if (subOrders.length !== subOrderIds.length) {
      throw new BadRequestException(
        'Một hoặc nhiều SubOrder đã được hoàn tiền',
      );
    }
    // Cập nhật trạng thái hoàn tiền cho nhiều SubOrder cùng một lúc
    const result = await this.subOrderModel.updateMany(
      { _id: { $in: subOrderIds } },
      {
        $set: {
          'requestRefund.status': status,
          'requestRefund.updatedAt': new Date(),
          status: 'canceled',
        },
      },
    );

    if (result.modifiedCount === 0) {
      throw new BadRequestException('Không có SubOrder nào được cập nhật');
    }
    // tim các order
    return {
      message: 'Cập nhật trạng thái hoàn tiền cho các SubOrder thành công!',
    };
  }
  // xem tổng hợp thanh toán theo tháng của các nhà bán hàng từ subOrder
  async getPaymentSummaryForSellerService(
    sellerId: string,
    
  ) {
    // Tìm các SubOrder của sellerId trong khoảng thời gian từ dateFrom đến dateTo
    const subOrders = await this.subOrderModel.find({
      sellerId,
      status: 'completed',
      payProcessStatus: 'pending',
    }).populate({
      path: 'orderId',
      match: { paymentStatus: 'paid' },
    }).exec();

    // Filter out subOrders where orderId is null (i.e., paymentStatus did not match)
    // Tính tổng số tiền đã thanh toán và hoàn tiền
    const totalPaid = subOrders.reduce(
      (total, subOrder) => {
      if (!subOrder.requestRefund || subOrder.requestRefund.status !== 'refunded') {
        return total + subOrder.subTotal + subOrder.shippingFee;
      }
      return total;
      },
      0,
    );

    const totalRefunded = subOrders.reduce((total, subOrder) => {
      if (subOrder.requestRefund && subOrder.requestRefund.status === 'refunded') {
      return total + subOrder.subTotal + subOrder.shippingFee;
      }
      return total;
    }, 0);

    return {
      totalPaid,
      totalRefunded,
    };
  }

  // xem danh sách tổng hợp thanh toán theo tháng của các nhà bán hàng từ subOrder
  async getPaymentSummaryListForAdminService(
    dateFrom?: Date,
    dateTo?: Date,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: string|'asc' | 'desc' = 'desc',
    payProcessStatus :string = 'pending',
  ) {
    const query: any = { status: 'completed', payProcessStatus: payProcessStatus };

    if (dateFrom) {
      query.createdAt = { $gte: dateFrom };
    }
    if (dateTo) {
      const dateToObj = new Date(dateTo);
      dateToObj.setHours(23, 59, 59, 999);
      query.createdAt = { ...query.createdAt, $lte: dateToObj };
    }
    console.log(query);
    const subOrders = await this.subOrderModel
      .find(query)
      .populate({
        path: 'orderId',
        match: { paymentStatus: 'paid' },
      })
      .populate('sellerId', 'firstname lastname email banking phone avatar')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
       console.log(subOrders);
    const filteredSubOrders = subOrders.filter(subOrder => subOrder.orderId);

    const totalSubOrders = filteredSubOrders.length;

    const paymentSummary = filteredSubOrders.reduce((summary, subOrder) => {
      const sellerId = (subOrder.sellerId as any)._id.toString();
      if (!summary[sellerId]) {
        summary[sellerId] = {
          seller: subOrder.sellerId,
          totalPaid: 0,
          totalRefunded: 0,
          subOrdersPaid: [],
          subOrdersRefunded: [],
        };
      }
      if (!subOrder.requestRefund || subOrder.requestRefund.status !== 'refunded') {
        summary[sellerId].totalPaid += subOrder.subTotal + subOrder.shippingFee;
        summary[sellerId].subOrdersPaid.push(subOrder.subOrderUUID);
      } else {
        summary[sellerId].totalRefunded += subOrder.subTotal + subOrder.shippingFee;
        summary[sellerId].subOrdersRefunded.push(subOrder.subOrderUUID);
      }
      return summary;
    }, {});

    return {
      data: Object.values(paymentSummary),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalSubOrders / limit),
        totalSubOrders,
      },
    };
  }
  async updatePayprocessStatusService(
    subOrderIds: string[],
    payProcessStatus: string,
  ): Promise<any> {
    // Tìm các SubOrder theo subOrderIds
    const subOrders = await this.subOrderModel.find({ subOrderUUID: { $in: subOrderIds } });
    if (subOrders.length === 0) {
      throw new BadRequestException('Không tìm thấy SubOrder nào');
    }

    // Cập nhật trạng thái thanh toán cho tất cả các SubOrder
    const updateSub = await this.subOrderModel.updateMany(
      { subOrderUUID: { $in: subOrderIds } },
      { $set: { payProcessStatus } },
    );

    return { message: 'Cập nhật trạng thái thanh toán thành công!', updateSub };
  }
  /**
   * Hàm so sánh tỉnh/thành phố của hai địa chỉ.
   */
  private compareLastPartOfAddress(
    address1: string,
    address2: string,
  ): boolean {
    console.log(address1, address2);
    const lastPart1 = address1.split(',').pop()?.trim();
    const lastPart2 = address2.split(',').pop()?.trim();
    console.log(lastPart1, lastPart2);
    return lastPart1 === lastPart2;
  }

  /**
   * Hàm tính tổng trọng lượng của các sản phẩm.
   */
  private async calculateTotalWeight(
    orderItems: mongoose.Types.ObjectId[],
  ): Promise<number> {
    // Lấy danh sách OrderItems liên quan
    const items = await this.orderItemModel
      .find({ _id: { $in: orderItems } })
      .populate('productId');

    if (items.length === 0) {
      throw new BadRequestException(
        'Không tìm thấy sản phẩm nào để tính trọng lượng',
      );
    }

    // Tính tổng trọng lượng = trọng lượng sản phẩm * số lượng
    return items.reduce((totalWeight, item) => {
      const product = item.productId as any;
      if (!product.weight) {
        throw new BadRequestException(
          `Sản phẩm ${item.productName} không có thông tin trọng lượng`,
        );
      }
      return totalWeight + product.weight * item.quantity;
    }, 0);
  }

  /**
   * Hàm tính phí vận chuyển.
   */
  private calculateShippingFee(
    ghn: IShipping,
    totalWeight: number,
    isIntraProvince: boolean,
  ): number {
    const service = isIntraProvince ? ghn.intraProvince : ghn.interProvince;
    const baseFee = service.fee;

    // Chuyển đổi gram thành kg
    totalWeight = totalWeight / 1000;

    console.log(
      `Total weight: ${totalWeight}kg, Mass limit: ${service.mass}kg`,
    );

    // Tính thêm phí nếu trọng lượng vượt quá giới hạn
    const additionalFee =
      totalWeight > service.mass
        ? Math.ceil((totalWeight - service.mass) / 0.5) * service.more // Tính mỗi 0.5kg thêm phí "more"
        : 0;

    return baseFee + additionalFee;
  }
}
