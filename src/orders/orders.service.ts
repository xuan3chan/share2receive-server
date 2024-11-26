import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Order,
  SubOrder,
  OrderItem,
  Product,
  Cart,
  User,
} from '@app/libs/common/schema';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { CreateOrderByProductDto } from '@app/libs/common/dto/order.dto';
import { TransactionService } from 'src/transaction/transaction.service';
import { EventGateway } from '@app/libs/common/util/event.gateway';
import { MailerService } from 'src/mailer/mailer.service';
import { IShipping} from '@app/libs/common/interface';
@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(SubOrder.name) private subOrderModel: Model<SubOrder>,
    @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @InjectModel(User.name) private userModel: Model<User>,
    private EventGateway: EventGateway,
    private mailerService: MailerService,
    private transactionService: TransactionService,
  ) {}

  async createOrderService(userId: string): Promise<any> {
    // 1. Lấy các sản phẩm trong giỏ hàng của người dùng
    const cartItems = await this.cartModel
      .find({ userId, isCheckedOut: false })
      .populate('productId') // Populate để lấy thông tin sản phẩm
      .populate('userId', 'address phone');

    if (cartItems.length === 0) {
      throw new BadRequestException('Không có sản phẩm nào trong giỏ hàng!');
    }

    // 2. Nhóm sản phẩm trong giỏ hàng theo người bán (sellerId)
    const groupedBySeller = cartItems.reduce((result, item) => {
      const sellerId = (item.productId as any).userId.toString(); // sellerId của sản phẩm
      if (!result[sellerId]) {
        result[sellerId] = [];
      }
      result[sellerId].push(item);
      return result;
    }, {});

    // 3. Tạo các đơn hàng con (SubOrder) và sản phẩm trong đơn hàng (OrderItem)
    const subOrders = [];
    for (const [sellerId, items] of Object.entries(groupedBySeller) as [
      string,
      any[],
    ][]) {
      // Tạo danh sách sản phẩm cho SubOrder
      const orderItems = await Promise.all(
        (items as any[]).map(async (item) => {
          const orderItem = await this.orderItemModel.create({
            subOrderId: null, // Sẽ cập nhật sau khi SubOrder được tạo
            productId: item.productId._id,
            productName: item.productId.productName,
            quantity: item.amount,
            price: item.price,
            size: item.size,
            color: item.color,
          });
          return orderItem;
        }),
      );

      // Tính tổng tiền của SubOrder
      const subTotal = items.reduce((sum, item) => sum + item.total, 0);

      // Tạo SubOrder
      const subOrder = await this.subOrderModel.create({
        orderId: null, // Sẽ cập nhật sau khi Order được tạo
        sellerId,
        subTotal,
        products: orderItems.map((item) => item._id),
      });

      // Cập nhật subOrderId cho các OrderItem
      await this.orderItemModel.updateMany(
        { _id: { $in: orderItems.map((item) => item._id) } },
        { $set: { subOrderId: subOrder._id } },
      );

      subOrders.push(subOrder);
    }

    // 4. Tạo Order tổng
    const totalAmount = subOrders.reduce(
      (sum, subOrder) => sum + subOrder.subTotal,
      0,
    );
    const order = await this.orderModel.create({
      userId,
      phone: (cartItems[0].userId as any).phone,
      address: (cartItems[0].userId as any).address,
      totalAmount,
      paymentStatus: 'pending',
      TransactionId: null,
      subOrders: subOrders.map((subOrder) => subOrder._id),
    });

    // Cập nhật orderId cho từng SubOrder
    await this.subOrderModel.updateMany(
      { _id: { $in: subOrders.map((subOrder) => subOrder._id) } },
      { $set: { orderId: order._id } },
    );

    // 5. Đánh dấu các sản phẩm trong giỏ hàng là đã thanh toán
    await this.cartModel.updateMany(
      { _id: { $in: cartItems.map((item) => item._id) } },
      { $set: { isCheckedOut: true } },
    );
    // gui tin nhan cho cac nguoi ban lam sao lay orderUUID trong subOrder
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
          subOrder.orderUUID,
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
      throw new BadRequestException('Order not found or you do not have access to it.');
    }
  
    // Tính toán `summary` nếu cần
    let totalAmount = 0;
    let totalPrice = 0;
    let totalShippingFee = 0;
    const uniqueProductIds = new Set<string>();
  
    if (order.subOrders) {
      order.subOrders.forEach((subOrder: any) => {
        totalShippingFee += subOrder.shippingFee || 0;
        if (Array.isArray(subOrder.products)) {
          subOrder.products.forEach((product: any) => {
            totalAmount += product.quantity;
            totalPrice += product.quantity * product.price;
            if (product.productId) {
              uniqueProductIds.add(product.productId.toString());
            }
          });
        }
      });
    }
  
    const totalTypes = uniqueProductIds.size;
  
    return {
      data: order,
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
      subOrder.orderUUID,
      orderInfo,
    );
    this.EventGateway.sendAuthenticatedNotification(
      product.userId,
      'Bạn có đơn hàng mới',
      'Bạn có đơn hàng mới vui lòng kiểm tra đơn bán của bạn',
    );
    return { message: 'Đơn hàng được tạo thành công!', order };
  }
  async getOrdersByUserService(userId: string): Promise<any> {
    const orders = await this.orderModel
      .find({ userId })
      .populate({
        path: 'subOrders',
        select: '-createdAt -updatedAt',
        populate: [
          {
            path: 'products', // Populate sản phẩm trong subOrder
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
  
    return {
      data: orders,
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

  async getOrdersBySellerService(sellerId: string): Promise<any> {
    const orders = await this.subOrderModel
      .find({ sellerId })
      .populate({
        path: 'orderId',
        select: 'paymentStatus',
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
      });
  
    return { data: orders };
  }
  async updateSubOrderStatusService(
    sellerId: string,
    subOrderId: string,
    status: string,
  ): Promise<any> {
    console.log(subOrderId);
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
  async deleteSubOrderService(subOrderId: string, userId: string): Promise<any> {
    // 1. Tìm Order chứa SubOrder cần xóa
    const order = await this.orderModel.findOne({ subOrders: subOrderId, userId });
    if (!order) {
      throw new BadRequestException('Không tìm thấy Order liên quan đến SubOrder này');
    }
  
    // 2. Xóa SubOrder khỏi mảng subOrders của Order
    const updateResult = await this.orderModel.updateOne(
      { _id: order._id },
      { $pull: { subOrders: subOrderId } }
    );
  
    if (updateResult.modifiedCount === 0) {
      throw new BadRequestException('Không tìm thấy SubOrder hoặc không thuộc về userId');
    }
  
    // 3. Kiểm tra nếu mảng subOrders trống, xóa luôn Order
    if (order.subOrders.length === 1) {
      // SubOrder bị xóa là phần tử cuối cùng, xóa Order
      await this.orderModel.deleteOne({ _id: order._id });
    } else {
      // Nếu còn SubOrders khác, cập nhật lại totalAmount
      const remainingSubOrders = await this.subOrderModel.find({
        _id: { $in: order.subOrders.filter(id => id.toString() !== subOrderId) }, // Lọc bỏ subOrderId
      });
  
      const newTotalAmount = remainingSubOrders.reduce((total, subOrder) => total + subOrder.subTotal, 0);
  
      await this.orderModel.updateOne(
        { _id: order._id },
        { $set: { totalAmount: newTotalAmount } }
      );
    }
  
    // 4. Tìm SubOrder cần xóa
    const subOrder = await this.subOrderModel.findOne({ _id: subOrderId });
    if (!subOrder) {
      throw new BadRequestException('Không tìm thấy SubOrder hoặc không thuộc về sellerId');
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
      throw new BadRequestException('Không thể xóa OrderItem trong SubOrder đã được giao');
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
  
    const updatedSubOrders = await this.subOrderModel.find({ _id: { $in: order.subOrders } });
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
      throw new BadRequestException('Không thể cập nhật dịch vụ vận chuyển cho SubOrder đã được giao');
    }
  
    // Kiểm tra dịch vụ vận chuyển hợp lệ
    if (shippingService && !['GHN', 'GHTK', 'agreement'].includes(shippingService)) {
      throw new BadRequestException('Dịch vụ vận chuyển không hợp lệ');
    }
  
    // Nếu dịch vụ vận chuyển mới được chọn
    if (shippingService && subOrder.shippingService === shippingService) {
      throw new BadRequestException('Dịch vụ vận chuyển đã được chọn');
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
  
        const compare = this.compareLastPartOfAddress(addressOfBuyer, addressOfSeller);
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
  
    const updatedSubOrders = await this.subOrderModel.find({ _id: { $in: order.subOrders } });
    const newTotalAmount = updatedSubOrders.reduce(
      (total, sub) => total + sub.subTotal + sub.shippingFee,
      0,
    );
    console.log(newTotalAmount);
    await this.orderModel.updateOne(
      { _id: order._id },
      { $set: { totalAmount: newTotalAmount } },
    );
  
    return { message: 'Cập nhật dịch vụ vận chuyển thành công!' };
  }


  /**
   * Hàm so sánh tỉnh/thành phố của hai địa chỉ.
   */
  private compareLastPartOfAddress(address1: string, address2: string): boolean {
    const lastPart1 = address1.split(',').pop()?.trim();
    const lastPart2 = address2.split(',').pop()?.trim();
    console.log(lastPart1, lastPart2);
    return lastPart1 === lastPart2;
  }
  
  /**
   * Hàm tính tổng trọng lượng của các sản phẩm.
   */
  private async calculateTotalWeight(orderItems: mongoose.Types.ObjectId[]): Promise<number> {
    // Lấy danh sách OrderItems liên quan
    const items = await this.orderItemModel.find({ _id: { $in: orderItems } }).populate('productId');
  
    if (items.length === 0) {
      throw new BadRequestException('Không tìm thấy sản phẩm nào để tính trọng lượng');
    }
  
    // Tính tổng trọng lượng = trọng lượng sản phẩm * số lượng
    return items.reduce((totalWeight, item) => {
      const product = item.productId as any;
      if (!product.weight) {
        throw new BadRequestException(`Sản phẩm ${item.productName} không có thông tin trọng lượng`);
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
  
    console.log(`Total weight: ${totalWeight}kg, Mass limit: ${service.mass}kg`);
  
    // Tính thêm phí nếu trọng lượng vượt quá giới hạn
    const additionalFee =
      totalWeight > service.mass
        ? Math.ceil((totalWeight - service.mass) / 0.5) * service.more // Tính mỗi 0.5kg thêm phí "more"
        : 0;
  
    return baseFee + additionalFee;
  }
  
  

}
