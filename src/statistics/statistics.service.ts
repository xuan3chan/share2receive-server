import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Order,
  OrderItem,
  OrderItemDocument,
  Product,
  ProductDocument,
  SubOrder,
  SubOrderDocument,
} from '@app/libs/common/schema';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectModel(SubOrder.name)
    private readonly subOrderModel: Model<SubOrderDocument>,
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<SubOrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}
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
          totalSubTotal: { $sum: '$subTotal' },
          totalShippingFee: { $sum: '$shippingFee' },
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
            totalPaid:
              match.totalSubTotal + match.totalShippingFee - match.totalRefund,
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
        return summary;
      },
      { totalSubTotal: 0, totalShippingFee: 0, totalRefund: 0, totalPaid: 0 },
    );
    allSummary.totalPaid =
      allSummary.totalSubTotal +
      allSummary.totalShippingFee -
      allSummary.totalRefund;

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
}
