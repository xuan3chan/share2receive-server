import { BadRequestException, Injectable } from '@nestjs/common';
import { Order, SubOrder, OrderItem, Product, Cart } from '@app/libs/common/schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';


@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(SubOrder.name) private subOrderModel: Model<SubOrder>,
    @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel('Cart') private cartModel: Model<Cart>,
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
    for (const [sellerId, items] of Object.entries(groupedBySeller) as [string, any[]][]) {
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
    const totalAmount = subOrders.reduce((sum, subOrder) => sum + subOrder.subTotal, 0);
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
  
    return { message: 'Đơn hàng được tạo thành công!', order };
  }
  
  async getOrdersService(orderId: string, userId: string): Promise<any> {
    const order = await this.orderModel
      .findOne({ _id: orderId, userId })
      .populate({
        path: 'subOrders', // Populate subOrders và UserId trong Order
        select: '-createdAt -updatedAt', // Chỉ lấy các trường cần thiết (tùy ý)
        populate: [
          {
            path: 'products', // Populate products trong SubOrder
            model: 'OrderItem', // Model được sử dụng cho products
            select: '-createdAt -updatedAt', // Chỉ lấy các trường cần thiết (tùy ý)
          },
          {
            path: 'sellerId', // Populate thông tin người bán
            model: 'User', // Model người bán
            select: 'fisrtname lastname address phone avatar email', // Chỉ lấy các trường cần thiết (tùy ý)
          },
        ],
      }
    ).populate('userId', 'firstname lastname address phone avatar email');
  
  
    return { data: order };
  }
  
  async updateInfoOrderService(orderId: string, userId: string, phone: string, address: string): Promise<any> {
    const order = await this.orderModel.findOneAndUpdate
    (
      { _id: orderId, userId },
      { phone, address },
      { new: true }
    );
    return { message: 'Cập nhật thông tin đơn hàng thành công!', order };
  }
}

