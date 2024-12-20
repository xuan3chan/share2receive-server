import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from '@app/libs/common/schema/attendance.schema';
import * as moment from 'moment-timezone';
import { WalletService } from 'src/wallet/wallet.service';
import { Configs, ConfigsDocument } from '@app/libs/common/schema';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Configs.name) private readonly configModel: Model<ConfigsDocument>,
    private readonly walletService: WalletService
  ) {}

  // Lấy giá trị điểm khuyến mãi từ cấu hình
  private async getValueToPromotion(): Promise<number> {
    const config = await this.configModel.findOne().select('valueToPromotion').lean();
    return config?.valueToPromotion || 0;
  }

  // 1. Lấy thông tin điểm danh trong tuần hiện tại
  async getWeeklyAttendanceService(userId: string): Promise<any> {
    const startOfWeek = moment.tz('Asia/Ho_Chi_Minh').startOf('isoWeek'); // Thứ Hai đầu tuần
    const endOfWeek = moment.tz('Asia/Ho_Chi_Minh').endOf('isoWeek'); // Chủ Nhật cuối tuần

    // Truy vấn điểm danh trong tuần
    const attendances = await this.attendanceModel.find({
      userId,
      date: {
        $gte: startOfWeek.toDate(),
        $lte: endOfWeek.toDate(),
      },
    }).exec();

    // Tạo danh sách tất cả các ngày trong tuần
    const weekDays = [];
    for (let day = startOfWeek.clone(); day.isSameOrBefore(endOfWeek, 'day'); day.add(1, 'day')) {
      weekDays.push(day.clone());
    }

    // Định dạng danh sách điểm danh
    const weekAttendances = weekDays.map((day) => {
      const attendance = attendances.find((a) => moment(a.date).isSame(day, 'day'));
      return {
        date: day.format('YYYY-MM-DD'),
        isAttendance: attendance ? attendance.isAttendance : false,
      };
    });

    return {
      data: {
        weekStart: startOfWeek.format('YYYY-MM-DD'),
        weekEnd: endOfWeek.format('YYYY-MM-DD'),
        attendances: weekAttendances,
      },
    };
  }

  // 2. Điểm danh thủ công
  async markAttendanceService(userId: string, isAttendance: boolean): Promise<Attendance> {
    const startOfToday = moment.tz('Asia/Ho_Chi_Minh').startOf('day').toDate(); // 00:00 hôm nay
    const endOfToday = moment.tz('Asia/Ho_Chi_Minh').endOf('day').toDate(); // 23:59 hôm nay

    // Kiểm tra điểm danh trong ngày
    const existingAttendance = await this.attendanceModel.findOne({
      userId,
      date: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    });

    if (existingAttendance) {
      throw new BadRequestException('Attendance already marked for today');
    }

    // Lấy điểm khuyến mãi từ cấu hình
    const pointPromo = await this.getValueToPromotion();

    // Cộng điểm khuyến mãi và tạo bản ghi điểm danh
    await this.walletService.addPointForOutService(userId, pointPromo);

    const newAttendance = new this.attendanceModel({
      userId,
      date: moment().toDate(), // Thời gian hiện tại (UTC)
      isAttendance,
    });

    return newAttendance.save();
  }
}
