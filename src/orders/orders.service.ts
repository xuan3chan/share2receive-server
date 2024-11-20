import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Order,
  SubOrder,
  OrderItem,
  Product,
  Cart,
  User,
} from '@app/libs/common/schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { CreateOrderByProductDto } from '@app/libs/common/dto/order.dto';
import { TransactionService } from 'src/transaction/transaction.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(SubOrder.name) private subOrderModel: Model<SubOrder>,
    @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @InjectModel(User.name) private userModel: Model<User>,
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
      })
      .populate('userId', 'firstname lastname address phone avatar email');

    return { data: order };
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
    return { message: 'Đơn hàng được tạo thành công!', order };
  }
  async getOrdersByUserService(userId: string): Promise<any> {
    const orders = await this.orderModel
      .find({ userId })
      .populate({
        path: 'subOrders',
        select: '-createdAt -updatedAt',
        populate: {
          path: 'products',
          model: 'OrderItem',
          select: '-createdAt -updatedAt',
        },
      })
      .populate('userId', 'firstname lastname address phone avatar email');

    return { data: orders };
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
      });
    return { data: orders };
  }
  async updateSubOrderStatusService(
    sellerId: string,
    subOrderId: string,
    status: string,
  ): Promise<any> {
    console.log(status);
    // Kiểm tra subOrder thuộc về sellerId
    const subOrder = await this.subOrderModel.findOne({
      _id: subOrderId,
      sellerId,
    });
  
    if (!subOrder) {
      throw new BadRequestException(
        'Không tìm thấy SubOrder hoặc SubOrder không thuộc về sellerId',
      );
    }
  
    // Cập nhật trạng thái cho SubOrder
    subOrder.status = status;
    await subOrder.save();
  
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
  
  
}
