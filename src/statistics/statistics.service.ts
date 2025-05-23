import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Cart,
  CartDocument,
  Configs,
  ConfigsDocument,
  Order,
  OrderItem,
  OrderItemDocument,
  Product,
  ProductDocument,
  Revenue,
  RevenueDocument, 
  SubOrder,
  SubOrderDocument,
  User,
  UserDocument,
} from '@app/libs/common/schema';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectModel(SubOrder.name)
    private readonly subOrderModel: Model<SubOrderDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<SubOrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    @InjectModel(User.name) 
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Revenue.name)
    private readonly revenueModel: Model<RevenueDocument>,
    @InjectModel(Configs.name) private readonly configModel: Model<ConfigsDocument>,
  ) {}

  private async getPerPointValue(): Promise<number> {
    const config = await this.configModel.findOne().select('valueToPoint').lean();
    return config?.valueToPoint || 1000;
  }

  async getStaticSallerService(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    viewBy: string = 'day', // Giá trị mặc định là "day"
  ): Promise<any> {
    const matchConditions: any = {
      sellerId: new mongoose.Types.ObjectId(userId),
    };
  
    // Tính toán mặc định cho startDate và endDate nếu không được truyền
    const now = new Date();
    if (!startDate || !endDate) {
      switch (viewBy) {
        case 'month':
          startDate =
            startDate || new Date(now.getFullYear(), now.getMonth() - 5, 1); // 5 tháng trước
          endDate =
            endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0); // Kết thúc tháng hiện tại
          break;
        case 'year':
          startDate = startDate || new Date(now.getFullYear() - 5, 0, 1); // 5 năm trước
          endDate = endDate || new Date(now.getFullYear(), 11, 31); // Kết thúc năm hiện tại
          break;
        case 'day':
        default:
          startDate = startDate || new Date(now.setDate(now.getDate() - 5)); // 5 ngày trước
          endDate = endDate || new Date(); // Ngày hiện tại
          break;
      }
    }
  
    matchConditions.createdAt = { $gte: startDate, $lte: endDate };
  
    // Xác định format của `$dateToString` dựa trên `viewBy`
    let dateFormat: string;
    let unit: string;
    switch (viewBy) {
      case 'month':
        dateFormat = '%Y-%m';
        unit = 'month';
        break;
      case 'year':
        dateFormat = '%Y';
        unit = 'year';
        break;
      case 'day':
      default:
        dateFormat = '%Y-%m-%d';
        unit = 'day';
        break;
    }
  
    const result = await this.subOrderModel.aggregate([
      {
        $match: matchConditions,
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: dateFormat, date: '$createdAt' },
            },
          },
          paidUUIDs: {
            $push: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    {
                      $or: [
                        { requestRefund: null },
                        {
                          $ne: [
                            {
                              $getField: {
                                field: 'status',
                                input: '$requestRefund',
                              },
                            },
                            'approved',
                          ],
                        },
                      ],
                    },
                  ],
                },
                '$subOrderUUID',
                null,
              ],
            },
          },
          refundedUUIDs: {
            $push: {
              $cond: [
                {
                  $eq: [
                    {
                      $getField: {
                        field: 'status',
                        input: '$requestRefund',
                      },
                    },
                    'approved',
                  ],
                },
                '$subOrderUUID',
                null,
              ],
            },
          },
          totalSubTotal: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] }, // Đơn đã hoàn thành
                    {
                      $or: [
                        { requestRefund: null }, // Không có yêu cầu hoàn tiền
                        {
                          $ne: [
                            {
                              $getField: {
                                field: 'status',
                                input: '$requestRefund',
                              },
                            },
                            'approved', // Loại trừ các đơn hoàn tiền đã được duyệt
                          ],
                        },
                      ],
                    },
                  ],
                },
                '$subTotal',
                0, // Nếu không thỏa mãn điều kiện, subTotal là 0
              ],
            },
          },
          totalShippingFee: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] }, // Đơn đã hoàn thành
                    {
                      $or: [
                        { requestRefund: null }, // Không có yêu cầu hoàn tiền
                        {
                          $ne: [
                            {
                              $getField: {
                                field: 'status',
                                input: '$requestRefund',
                              },
                            },
                            'approved', // Loại trừ đơn bị hoàn tiền
                          ],
                        },
                      ],
                    },
                  ],
                },
                '$shippingFee',
                0, // Không thỏa mãn điều kiện => Không tính phí vận chuyển
              ],
            },
          },
          totalRefund: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    {
                      $getField: {
                        field: 'status',
                        input: '$requestRefund',
                      },
                    },
                    'approved',
                  ],
                },
                { $add: ['$subTotal', '$shippingFee'] },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          paidUUIDs: {
            $setDifference: [
              {
                $filter: {
                  input: '$paidUUIDs',
                  as: 'item',
                  cond: { $ne: ['$$item', null] },
                },
              },
              {
                $filter: {
                  input: '$refundedUUIDs',
                  as: 'item',
                  cond: { $ne: ['$$item', null] },
                },
              },
            ],
          },
          refundedUUIDs: {
            $filter: {
              input: '$refundedUUIDs',
              as: 'item',
              cond: { $ne: ['$$item', null] },
            },
          },
          totalSubTotal: 1,
          totalShippingFee: 1,
          totalRefund: 1,
        },
      },
      {
        $sort: { '_id.date': 1 },
      },
    ]);
  
    // Tạo danh sách đầy đủ các ngày/tháng/năm trong khoảng thời gian
    const fullDateRange = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      if (unit === 'day') {
        fullDateRange.push(current.toISOString().slice(0, 10)); // Định dạng YYYY-MM-DD
        current.setDate(current.getDate() + 1);
      } else if (unit === 'month') {
        fullDateRange.push(
          `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`, // Định dạng YYYY-MM
        );
        current.setMonth(current.getMonth() + 1);
      } else if (unit === 'year') {
        fullDateRange.push(`${current.getFullYear()}`); // Định dạng YYYY
        current.setFullYear(current.getFullYear() + 1);
      }
    }
  
    // Ghép dữ liệu từ MongoDB với danh sách đầy đủ
    const dailyDetails = fullDateRange.map((date) => {
      const match = result.find((item) => item._id.date === date);
      if (match) {
        return {
          date,
          paidUUIDs: match.paidUUIDs,
          refundedUUIDs: match.refundedUUIDs,
          summary: {
            totalSubTotal: match.totalSubTotal,
            totalShippingFee: match.totalShippingFee,
            totalRefund: match.totalRefund,
            totalPaid: match.totalSubTotal + match.totalShippingFee, // Chỉ cộng totalSubTotal và totalShippingFee
          },
        };
      } else {
        return {
          date,
          paidUUIDs: [],
          refundedUUIDs: [],
          summary: {
            totalSubTotal: 0,
            totalShippingFee: 0,
            totalRefund: 0,
            totalPaid: 0,
          },
        };
      }
    });
  
    // Chuẩn bị tổng hợp dữ liệu
    const allSummary = dailyDetails.reduce(
      (summary, item) => {
        summary.totalSubTotal += item.summary.totalSubTotal;
        summary.totalShippingFee += item.summary.totalShippingFee;
        summary.totalRefund += item.summary.totalRefund;
        summary.totalPaid += item.summary.totalSubTotal + item.summary.totalShippingFee; // Không trừ totalRefund
        return summary;
      },
      { totalSubTotal: 0, totalShippingFee: 0, totalRefund: 0, totalPaid: 0 },
    );
  
    return {
      dailyDetails,
      allSummary,
    };
  }
  
  

  async getStaticEcoService(userId: string): Promise<any> {
    try {
      // Lấy danh sách productId từ Order của userId (mua) và SubOrder của userId (bán)
      const productIds = await this.orderModel.aggregate([
        {
          $match: { userId: new mongoose.Types.ObjectId(userId) }, // Lọc Order theo userId là người mua
        },
        {
          $lookup: {
            from: 'suborders', // Liên kết với SubOrder collection
            localField: '_id',
            foreignField: 'orderId',
            as: 'subOrders',
          },
        },
        {
          $unwind: '$subOrders', // Giải phóng mảng SubOrder
        },
        {
          $lookup: {
            from: 'orderitems', // Liên kết với OrderItem collection
            localField: 'subOrders._id',
            foreignField: 'subOrderId',
            as: 'orderItems',
          },
        },
        {
          $unwind: '$orderItems', // Giải phóng mảng OrderItem
        },
        {
          $project: {
            productId: '$orderItems.productId', // Lấy productId từ OrderItem
          },
        },
        {
          $unionWith: {
            coll: 'suborders',
            pipeline: [
              {
                $match: { sellerId: new mongoose.Types.ObjectId(userId) }, // Lọc SubOrder theo sellerId là người bán
              },
              {
                $lookup: {
                  from: 'orderitems', // Liên kết với OrderItem collection
                  localField: '_id',
                  foreignField: 'subOrderId',
                  as: 'orderItems',
                },
              },
              {
                $unwind: '$orderItems', // Giải phóng mảng OrderItem
              },
              {
                $project: {
                  productId: '$orderItems.productId', // Lấy productId từ OrderItem
                },
              },
            ],
          },
        },
        {
          $group: {
            _id: null,
            productIds: { $addToSet: '$productId' }, // Loại bỏ trùng lặp productId
          },
        },
      ]);

      // Lấy danh sách productId
      const uniqueProductIds = productIds[0]?.productIds || [];

      // Lấy thông tin sản phẩm từ productModel
      const products = await this.productModel
        .find({ _id: { $in: uniqueProductIds } })
        .lean();

      // Tính tổng trọng lượng
      const totalWeight = products.reduce((sum, product) => {
        return sum + (product.weight || 0); // Nếu không có weight, sử dụng 0
      }, 0);

      return {
        totalWeight,
      };
    } catch (error) {
      console.error('Error in getStaticEcoService:', error);
      throw new BadRequestException('Failed to get static eco service');
    }
  }
  async getStaticAllEcoService(): Promise<any> {
    try {
      // Lấy danh sách productId từ tất cả các Order và SubOrder
      const productIds = await this.orderModel.aggregate([
        {
          $lookup: {
            from: 'suborders', // Liên kết với SubOrder collection
            localField: '_id',
            foreignField: 'orderId',
            as: 'subOrders',
          },
        },
        {
          $unwind: '$subOrders', // Giải phóng mảng SubOrder
        },
        {
          $lookup: {
            from: 'orderitems', // Liên kết với OrderItem collection
            localField: 'subOrders._id',
            foreignField: 'subOrderId',
            as: 'orderItems',
          },
        },
        {
          $unwind: '$orderItems', // Giải phóng mảng OrderItem
        },
        {
          $project: {
            productId: '$orderItems.productId', // Lấy productId từ OrderItem
          },
        },
        {
          $unionWith: {
            coll: 'suborders',
            pipeline: [
              {
                $lookup: {
                  from: 'orderitems', // Liên kết với OrderItem collection
                  localField: '_id',
                  foreignField: 'subOrderId',
                  as: 'orderItems',
                },
              },
              {
                $unwind: '$orderItems', // Giải phóng mảng OrderItem
              },
              {
                $project: {
                  productId: '$orderItems.productId', // Lấy productId từ OrderItem
                },
              },
            ],
          },
        },
        {
          $group: {
            _id: null,
            productIds: { $addToSet: '$productId' }, // Loại bỏ trùng lặp productId
          },
        },
      ]);
  
      // Lấy danh sách productId
      const uniqueProductIds = productIds[0]?.productIds || [];
  
      // Lấy thông tin sản phẩm từ productModel
      const products = await this.productModel
        .find({ _id: { $in: uniqueProductIds } })
        .lean();
  
      // Tính tổng trọng lượng
      const totalWeight = products.reduce((sum, product) => {
        return sum + (product.weight || 0); // Nếu không có weight, sử dụng 0
      }, 0);
  
      return {
        totalWeight,
      };
    } catch (error) {
      console.error('Error in getStaticEcoService:', error);
      throw new BadRequestException('Failed to get static eco service');
    }
  }
  
  async getStaticTimeAddCartService(userId: string): Promise<{ data: any[], totalAdd: number }> {
    // Lấy tất cả các sản phẩm trong giỏ hàng
    const cart = await this.cartModel.find().lean();
  
    // Lấy danh sách productId từ cart
    const productIds = cart.map((item) => item.productId);
  
    // Tìm sản phẩm trong productModel dựa trên productId
    const products = await this.productModel.find({ _id: { $in: productIds } }).lean();
  
    // Lọc ra những sản phẩm có userId trùng khớp
    const userProducts = products.filter((item) => item.userId.toString() === userId);
  
    // Lọc giỏ hàng dựa trên sản phẩm của userId
    const addCart = cart.filter((item) =>
      userProducts.some((product) => product._id.toString() === item.productId.toString())
    );
  
    // Phân loại và đếm số lần thêm từng sản phẩm
    const productCount = addCart.reduce((acc, item) => {
      const productId = item.productId.toString();
      if (!acc[productId]) {
        acc[productId] = 0;
      }
      acc[productId]++;
      return acc;
    }, {});
  
    // Tạo danh sách sản phẩm với số lần xuất hiện
    const result = userProducts.map((product) => ({
      productId: product._id.toString(),
      productName: product.productName || 'Unknown Product', // Thêm tên sản phẩm nếu có
      imgUrls: product.imgUrls || [], // Thêm ảnh sản phẩm nếu có
      timesAdded: productCount[product._id.toString()] || 0,
    }));
    
    // Tính tổng số lần thêm sản phẩm
    const totalAdd = result.reduce((sum, product) => sum + product.timesAdded, 0);
  
    return { data: result, totalAdd };
  }
  
  async getStaticTimeRegisterService(
   
    startDate?: Date, // Ngày bắt đầu (tuỳ chọn)
    endDate?: Date, // Ngày kết thúc (tuỳ chọn)
    type: string = 'day' // Loại thời gian (day, month, year)
  ): Promise<any> {
    const now = new Date();
    let start: Date = new Date();
    let end: Date = new Date();
    let periods: string[] = []; // Các khoảng thời gian cần trả về
  
    // Tính toán start và end nếu không truyền
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      if (type === 'day') {
        // 5 ngày trước đó
        start = new Date(now);
        start.setDate(now.getDate() - 5);
        end = now;
        for (let i = 0; i < 5; i++) {
          const date = new Date();
          date.setDate(now.getDate() - i);
          periods.push(date.toISOString().split('T')[0]); // Định dạng YYYY-MM-DD
        }
      } else if (type === 'month') {
        // 5 tháng trước đó
        start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        end = now;
        for (let i = 0; i < 5; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          periods.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`); // Định dạng YYYY-MM
        }
      } else if (type === 'year') {
        // 5 năm trước đó
        start = new Date(now.getFullYear() - 5, 0, 1);
        end = now;
        for (let i = 0; i < 5; i++) {
          periods.push(String(now.getFullYear() - i)); // Định dạng YYYY
        }
      }
    }
  
    // Aggregation pipeline
    const groupBy =
      type === 'day'
        ? { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        : type === 'month'
        ? { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
        : { $dateToString: { format: '%Y', date: '$createdAt' } };
  
    const result = await this.userModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 }, // Đếm số lượng người dùng
        },
      },
      {
        $sort: { _id: 1 }, // Sắp xếp theo thời gian
      },
    ]);
  
    // Chuyển đổi kết quả thành danh sách đầy đủ với các khoảng thời gian
    if (!startDate || !endDate) {
      const dataMap = new Map(result.map((item) => [item._id, item.count]));
      return periods.map((period) => ({
        time: period,
        count: dataMap.get(period) || 'Không có dữ liệu', // Điền "Không có dữ liệu" nếu không có
      }));
    }
  
    return result.map((item) => ({
      time: item._id,
      count: item.count,
    }));
  }
 
  async getStaticOrderManagerService(
    startDate: Date,
    endDate: Date,
    viewBy: string = 'day',
  ): Promise<any> {
    const matchConditions: any = {};
  
    if (startDate && endDate) {
      matchConditions.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
  
    const groupByDate = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
      year: { $dateToString: { format: '%Y', date: '$createdAt' } },
    }[viewBy];
  
    const pipeline = [
      {
        $match: {
          ...matchConditions,
          status: { $in: ['completed', 'refund', 'canceled'] },
        },
      },
      {
        $addFields: {
          totalRefund: {
            $cond: [
              { $or: [{ $eq: ['$requestRefund.status', 'approved'] }, { $eq: ['$status', 'canceled'] }] },
              { $add: ['$subTotal', '$shippingFee'] },
              0,
            ],
          },
          totalPaid: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'completed'] },
                  { $or: [{ $eq: ['$requestRefund', null] }, { $eq: ['$requestRefund.status', null] }] },
                ],
              },
              { $add: ['$subTotal', '$shippingFee'] },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: groupByDate,
          paidUUIDs: {
            $addToSet: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $or: [{ $eq: ['$requestRefund', null] }, { $eq: ['$requestRefund.status', null] }] },
                  ],
                },
                '$subOrderUUID',
                null,
              ],
            },
          },
          refundedUUIDs: {
            $addToSet: {
              $cond: [
                { $or: [{ $eq: ['$requestRefund.status', 'approved'] }, { $eq: ['$status', 'canceled'] }] },
                '$subOrderUUID',
                null,
              ],
            },
          },
          totalSubTotal: { $sum: '$subTotal' },
          totalShippingFee: { $sum: '$shippingFee' },
          totalRefund: { $sum: '$totalRefund' },
          totalPaid: { $sum: '$totalPaid' },
          totalCompletedOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $or: [{ $eq: ['$requestRefund', null] }, { $eq: ['$requestRefund.status', null] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalRefundedOrders: {
            $sum: {
              $cond: [{ $eq: ['$requestRefund.status', 'approved'] }, 1, 0],
            },
          },
          totalCanceledOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'canceled'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          paidUUIDs: {
            $filter: {
              input: '$paidUUIDs',
              as: 'uuid',
              cond: { $ne: ['$$uuid', null] },
            },
          },
          refundedUUIDs: {
            $filter: {
              input: '$refundedUUIDs',
              as: 'uuid',
              cond: { $ne: ['$$uuid', null] },
            },
          },
          summary: {
            totalSubTotal: '$totalSubTotal',
            totalShippingFee: '$totalShippingFee',
            totalRefund: '$totalRefund',
            totalPaid: '$totalPaid',
            totalCompletedOrders: '$totalCompletedOrders',
            totalRefundedOrders: '$totalRefundedOrders',
            totalCanceledOrders: '$totalCanceledOrders',
          },
        },
      },
      { $sort: { date: 1 as 1 | -1 } },
    ];
  
    const dailyDetails = await this.subOrderModel.aggregate(pipeline);
  
    // Generate the complete list of dates/months/years based on viewBy
    const allDates: string[] = [];
    let currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
  
    while (currentDate <= endDateObj) {
      if (viewBy === 'day') {
        allDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (viewBy === 'month') {
        allDates.push(
          `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
        );
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (viewBy === 'year') {
        allDates.push(`${currentDate.getFullYear()}`);
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      }
    }
  
    // Map the aggregation results to the complete date list
    const resultsByDate = dailyDetails.reduce((acc, detail) => {
      acc[detail.date] = detail;
      return acc;
    }, {});
  
    const completeResults = allDates.map(date => ({
      date,
      paidUUIDs: resultsByDate[date]?.paidUUIDs || [],
      refundedUUIDs: resultsByDate[date]?.refundedUUIDs || [],
      summary: resultsByDate[date]?.summary || {
        totalSubTotal: 0,
        totalShippingFee: 0,
        totalRefund: 0,
        totalPaid: 0,
        totalCompletedOrders: 0,
        totalRefundedOrders: 0,
        totalCanceledOrders: 0,
      },
    }));
  
    // Calculate allSummary
    const allSummary = completeResults.reduce(
      (acc, cur) => {
        acc.totalSubTotal += cur.summary.totalSubTotal;
        acc.totalShippingFee += cur.summary.totalShippingFee;
        acc.totalRefund += cur.summary.totalRefund;
        acc.totalPaid += cur.summary.totalPaid;
        acc.totalCompletedOrders += cur.summary.totalCompletedOrders;
        acc.totalRefundedOrders += cur.summary.totalRefundedOrders;
        acc.totalCanceledOrders += cur.summary.totalCanceledOrders;
        return acc;
      },
      {
        totalSubTotal: 0,
        totalShippingFee: 0,
        totalRefund: 0,
        totalPaid: 0,
        totalCompletedOrders: 0,
        totalRefundedOrders: 0,
        totalCanceledOrders: 0,
      },
    );
  
    return {
      dailyDetails: completeResults,
      allSummary,
    };
  }
  async getStaticRevenueService(
    startDate?: Date,
    endDate?: Date,
    viewBy: string = 'revenue', // Default to 'revenue'
    dateBy: string = 'day' // Default to 'day'
  ): Promise<any> {
    try {
      const perPoint = await this.getPerPointValue();
      // Build filter conditions
      const filter: any = {};
      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate), // Start date
          $lte: new Date(endDate), // End date
        };
      }
      console.log('filter:', filter);
  
      // Determine date format based on dateBy
      let dateFormat = '%Y/%m/%d'; // Default: day
      if (dateBy === 'month') {
        dateFormat = '%Y/%m'; // Group by month
      } else if (dateBy === 'year') {
        dateFormat = '%Y'; // Group by year
      }
  
      // Aggregate data grouped by date
      const dailySummary = await this.revenueModel.aggregate([
        { $match: filter },
        {
          $project: {
            date: {
              $dateToString: { format: dateFormat, date: '$createdAt' },
            },
            description: 1,
            amount: 1,
          },
        },
        {
          $group: {
            _id: '$date',
            promotionAmount: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: '$description', regex: 'promotion', options: 'i' } },
                  '$amount',
                  0,
                ],
              },
            },
            saleAmount: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: '$description', regex: 'sale', options: 'i' } },
                  '$amount',
                  0,
                ],
              },
            },
            buyAmount: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: '$description', regex: 'buy', options: 'i' } },
                  '$amount',
                  0,
                ],
              },
            },
            productAmount: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: '$description', regex: 'product', options: 'i' } },
                  '$amount',
                  0,
                ],
              },
            },
          },
        },
        {
          $sort: { _id: 1 }, // Sort by date
        },
      ]);
  
      // Calculate total summary
      const totalSummary = dailySummary.reduce(
        (acc, cur) => {
          acc.totalPromotion += cur.promotionAmount || 0;
          acc.totalSale += cur.saleAmount || 0;
          acc.totalBuy += cur.buyAmount || 0;
          acc.totalProduct += cur.productAmount || 0;
          return acc;
        },
        {
          totalPromotion: 0,
          totalSale: 0,
          totalBuy: 0,
          totalProduct: 0,
        }
      );
  
      // Adjust amounts based on viewBy
      const multiplier = viewBy === 'revenue' ? perPoint : 1;
  
      // Format the result
      const formattedData = dailySummary.map((item) => ({
        date: item._id,
        promotionAmount: (item.promotionAmount || 0) * multiplier,
        saleAmount: (item.saleAmount || 0) * multiplier,
        buyAmount: (item.buyAmount || 0) * multiplier,
        productAmount: (item.productAmount || 0) * multiplier,
      }));
  
      return {
        data: formattedData,
        summarize: {
          totalPromotion: totalSummary.totalPromotion * multiplier,
          totalSale: totalSummary.totalSale * multiplier,
          totalBuy: totalSummary.totalBuy * multiplier,
          totalProduct: totalSummary.totalProduct * multiplier,
        },
      };
    } catch (error) {
      console.error('Error fetching revenues:', error);
      throw new BadRequestException('Error fetching revenues');
    }
  }
  
  
  
  
  
}
