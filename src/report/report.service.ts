import { BadRequestException, Injectable } from '@nestjs/common';
import { Product, Report, ReportHistory, SubOrder, User } from '@app/libs/common/schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateReportDto } from '@app/libs/common/dto';
import { PopulatedReport } from '@app/libs/common/interface';
import { EventGateway } from '@app/libs/common/util/event.gateway';
import { NotificationService } from 'src/notification/notification.service';
import { MailerService } from 'src/mailer/mailer.service';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel('Report') private readonly reportModel: Model<Report>,
    @InjectModel('SubOrder') private readonly subOrderModel: Model<SubOrder>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel(ReportHistory.name) private readonly reportHistoryModel: Model<ReportHistory>,
    private readonly eventGateway: EventGateway,
    private readonly mailerService: MailerService,
  ) {}

  async createReportService(
    userId: string,
    createReportDto: CreateReportDto,
  ): Promise<Report> {
    try {
      let targetUserId: string | null = null; // Variable to store the target user ID
  
      if (createReportDto.reportType === 'order') {
        const subOrder = await this.subOrderModel.findById(createReportDto.targetId);
        if (!subOrder) {
          throw new BadRequestException('SubOrder not found');
        }
        targetUserId = subOrder.sellerId?.toString(); // Capture the seller ID
      }
  
      if (createReportDto.reportType === 'product') {
        const product = await this.productModel.findById(createReportDto.targetId);
        if (!product) {
          throw new BadRequestException('Product not found');
        }
        targetUserId = product.userId?.toString(); // Capture the product owner's user ID
      }
  
      if (!targetUserId) {
        throw new BadRequestException('Unable to determine target user for the report');
      }
  
      const { reportType, targetId, reason, description } = createReportDto;
      const report = new this.reportModel({
        userId,
        reportType,
        targetId,
        targetUserId, // Save the target user ID
        reason,
        description,
      });
      return await report.save();
    } catch (error) {
      console.error('Error creating report:', error);
      throw new BadRequestException(error.message);
    }
  }
  

  async getListReportService(
    reportType?: string, // Bổ sung reportType để lọc
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: string | 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * limit;

    // Điều kiện lọc dựa trên reportType
    const filter: any = {};
    if (reportType) {
      filter.reportType = reportType; // Thêm điều kiện lọc reportType
    }

    // Tổng số lượng báo cáo sau khi lọc
    const totalReports = await this.reportModel.countDocuments(filter);

    // Truy vấn dữ liệu ban đầu
    const reports = await this.reportModel
      .find(filter) // Áp dụng bộ lọc
      .populate('userId', 'firstname lastname phone address email')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit);

    // Xử lý logic populate targetId
    const populatedReports = await Promise.all(
      reports.map(async (report) => {
        const reportData = report.toObject() as unknown as PopulatedReport; // Ép kiểu sang PopulatedReport
        let targetData = null;

        if (report.reportType === 'product') {
          targetData = await this.productModel
            .findById(report.targetId)
            .select('_id productName userId isBlock imgUrls price')
            .populate(
              'userId',
              'firstname lastname phone address email isBlock',
            );
        } else if (report.reportType === 'order') {
          targetData = await this.subOrderModel
            .findById(report.targetId)
            .select(
              '_id sellerId subTotal shippingService shippingFee note status createdAt subOrderUUID',
            )
            .populate(
              'sellerId',
              'firstname lastname phone address email isBlock',
            );
        }

        reportData.target = targetData;
        return reportData;
      }),
    );

    return {
      totalReports,
      currentPage: page,
      totalPages: Math.ceil(totalReports / limit),
      data: populatedReports,
    };
  }

  async blockFromReportService(reportId: string) {
    // Tìm báo cáo cơ bản
    const report = await this.reportModel
      .findById(reportId)
      .populate('userId', 'firstname lastname email'); // Populate thông tin người báo cáo

    if (!report) {
      throw new BadRequestException('Report not found');
    }
    
    let userIdToBlock: string | null = null;

    // Nếu reportType là 'product', lấy userId từ Product
    if (report.reportType === 'product') {
      const product = await this.productModel
        .findById(report.targetId)
        .select('userId'); // Truy vấn Product để lấy userId
      if (product?.userId) {
        userIdToBlock = product.userId.toString(); // Lấy userId từ Product
      }
    }
    // Nếu reportType là 'order', lấy sellerId từ SubOrder
    else if (report.reportType === 'order') {
      const subOrder = await this.subOrderModel
        .findById(report.targetId)
        .select('sellerId'); // Truy vấn SubOrder để lấy sellerId
      if (subOrder?.sellerId) {
        userIdToBlock = subOrder.sellerId.toString(); // Lấy sellerId từ SubOrder
      }
    }

    if (!userIdToBlock) {
      throw new BadRequestException(
        'Unable to determine user to block from report',
      );
    }

    // Chặn người dùng
    const user = await this.userModel.findById(userIdToBlock);
    if (!user) {
      throw new BadRequestException('User not found for blocking');
    }

    if (user.isBlock) {
      throw new BadRequestException('User is already blocked');
    }

    user.isBlock = true; // Cập nhật trạng thái chặn
    report.status = 'Processed'; // Cập nhật trạng thái báo cáo
    this.mailerService.sendEmailNotify(
      user.email,
      'Chúng tôi đã phát hiện bạn vi phạm chính sách của chúng tôi. Vì Vậy tài khoản của bạn đã bị chặn. Vui lòng xem lại quy định và tuân thủ để tránh các hình phạt nghiêm trọng hơn.',
    )
    this.eventGateway.sendAuthenticatedNotification(
      user._id.toString(),
      'Cảnh báo vi phạm',
      'Chúng tôi đã phát hiện bạn vi phạm chính sách của chúng tôi. Vì Vậy tài khoản của bạn đã bị chặn. Vui lòng xem lại quy định và tuân thủ để tránh các hình phạt nghiêm trọng hơn.',
    );
    this.createHistoryService(userIdToBlock, 'block_user' );
    await user.save();
    await report.save();
  

    return {
      message: 'User successfully blocked',
      blockedUserId: userIdToBlock,
    };
  }

  async blockProductService(reportId: string) {
    const report = await this.reportModel
      .findById(reportId)
      .populate('userId', 'firstname lastname email');

    if (!report) {
      throw new BadRequestException('Report not found');
    }
    if (report.reportType !== 'product') {
      throw new BadRequestException('Report is not a product report');
    }

    const product = await this.productModel.findById(report.targetId);
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    if (product.isBlock) {
      throw new BadRequestException('Product is already blocked');
    }
    const user = await this.userModel.findById(report.targetUserId).select('email').lean();
    report.status = 'Processed'; // Cập nhật trạng thái báo cáo
    product.isBlock = true;
    this.mailerService.sendEmailNotify(
      user.email,
      'Chúng tôi đã phát hiện bạn vi phạm chính sách của chúng tôi. Vì Vậy sản phẩm của bạn đã bị chặn. Vui lòng xem lại quy định và tuân thủ để tránh các hình phạt nghiêm trọng hơn.',
    );
    this.eventGateway.sendAuthenticatedNotification(
      report.targetUserId,
      'Cảnh báo vi phạm',
      'Chúng tôi đã phát hiện bạn vi phạm chính sách của chúng tôi. Vì Vậy sản phẩm của bạn đã bị chặn. Vui lòng xem lại quy định và tuân thủ để tránh các hình phạt nghiêm trọng hơn.',
    );
    await product.save();
    await report.save();
    this.createHistoryService(report.targetUserId, 'block_block_product' );

    return {
      message: 'Product successfully blocked',
      blockedProductId: product._id,
    };
  }
  async warningUserService(reportId: string) {
    // Tìm báo cáo cơ bản
    const report = await this.reportModel
      .findById(reportId)
      .populate('userId', 'firstname lastname email'); // Populate thông tin người báo cáo

    if (!report) {
      throw new BadRequestException('Report not found');
    }

    let userIdToBlock: string | null = null;

    // Nếu reportType là 'product', lấy userId từ Product
    if (report.reportType === 'product') {
      const product = await this.productModel
        .findById(report.targetId)
        .select('userId'); // Truy vấn Product để lấy userId
      if (product?.userId) {
        userIdToBlock = product.userId.toString(); // Lấy userId từ Product
      }
    }
    // Nếu reportType là 'order', lấy sellerId từ SubOrder
    else if (report.reportType === 'order') {
      const subOrder = await this.subOrderModel
        .findById(report.targetId)
        .select('sellerId'); // Truy vấn SubOrder để lấy sellerId
      if (subOrder?.sellerId) {
        userIdToBlock = subOrder.sellerId.toString(); // Lấy sellerId từ SubOrder
      }
    }

    if (!userIdToBlock) {
      throw new BadRequestException(
        'Unable to determine user to block from report',
      );
    }

    // Chặn người dùng
    const user = await this.userModel.findById(userIdToBlock);
    if (!user) {
      throw new BadRequestException('User not found for blocking');
    }

    if (user.isBlock) {
      throw new BadRequestException('User is already blocked');
    }
    this.eventGateway.sendAuthenticatedNotification(
      user._id.toString(),
      'Cảnh báo vi phạm',
      'Chúng tôi đã phát hiện bạn vi phạm chính sách của chúng tôi nhiều lần. Nếu hành vi này tiếp tục, tài khoản của bạn có thể bị đình chỉ. Vui lòng xem lại quy định và tuân thủ để tránh các hình phạt nghiêm trọng hơn.',
    );
    this.mailerService.sendEmailNotify(
      user.email,
      'Chúng tôi đã phát hiện bạn vi phạm chính sách của chúng tôi nhiều lần. Nếu hành vi này tiếp tục, tài khoản của bạn có thể bị đình chỉ. Vui lòng xem lại quy định và tuân thủ để tránh các',
    );
    report.status = 'Processed'; // Cập nhật trạng thái báo cáo
    this.createHistoryService(report.targetUserId, 'warning' );
    await report.save();
    return {
      message: 'User successfully warned',
    };
  }

  async checkReportService(reportId: string,isChecked:boolean) {
    console.log('reportId',isChecked);
    const report = await this.reportModel.findById(reportId);
    if (!report) {
      throw new BadRequestException('Report not found');
    }
    // if (report.isCheckded) {
    //   throw new BadRequestException('Report is already checked')
    // }
    report.isChecked = isChecked;
    await report.save();

    let userIdToCheck: string | null = null;

    if (report.reportType === 'product') {
      const product = await this.productModel.findById(report.targetId).select('userId');
      if (product?.userId) {
        userIdToCheck = product.userId.toString();
      }
    } else if (report.reportType === 'order') {
      const subOrder = await this.subOrderModel.findById(report.targetId).select('sellerId');
      if (subOrder?.sellerId) {
        userIdToCheck = subOrder.sellerId.toString();
      }
    }
    if (userIdToCheck) {
      const userReports = await this.reportModel.countDocuments({
        targetUserId: userIdToCheck,
        isChecked: true,
      });

      if (userReports >= 5) {
        await this.blockFromReportService(reportId);
        console.log('5 diem');
      }else if (userReports >= 4) {
        if (report.reportType === 'product') {
          await this.blockProductService(reportId);
        console.log('4 diem');

        }
        await this.warningUserService(reportId);
        console.log('4 diem');

      }
       else if (userReports >= 3) {
        await this.warningUserService(reportId);
        console.log('3 diem');
      }
    }

    return {
      message: 'Report checked',
    };
  }
  async getHistoryReportService() {
    return await this.reportHistoryModel.find().populate(
      'userId',
      'firstname lastname email',
    ).sort({ createdAt: -1 });
  }
  private async createHistoryService(
    userId: string,
    action: string,
  ) {
    const history = new this.reportHistoryModel({
      userId,
      action,
    });
    return await history.save();
  }
}
