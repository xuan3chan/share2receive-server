import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from '@app/libs/common/schema/attendance.schema';
import * as moment from 'moment';
import { WalletService } from 'src/wallet/wallet.service';
import { Configs, ConfigsDocument } from '@app/libs/common/schema';

@Injectable()
export class AttendanceService {
    constructor(
        @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
        @InjectModel(Configs.name) private readonly configModel: Model<ConfigsDocument>,
        private readonly WalletService: WalletService
    ) {}

    private async getValueToPromotion () {
        const config = await this.configModel.findOne().select('valueToPromotion').lean();
        return config.valueToPromotion;
    }
    async getWeeklyAttendanceService(userId: string): Promise<any> {
        // Lấy ngày hiện tại
        const currentDate = moment();
    
        // Lấy startDate (Thứ Hai của tuần hiện tại)
        const startDate = currentDate.clone().startOf('isoWeek'); // Thứ Hai (đầu tuần)
        // Lấy endDate (Chủ Nhật của tuần hiện tại)
        const endDate = currentDate.clone().endOf('isoWeek'); // Chủ Nhật (cuối tuần)
    
    
        // Truy vấn điểm danh của người dùng trong tuần hiện tại
        const attendances = await this.attendanceModel.find({
            userId,
            date: {
                $gte: startDate.toDate(), // Bắt đầu tuần
                $lte: endDate.toDate()   // Kết thúc tuần
            }
        }).exec();
    
    
        // Tạo danh sách tất cả các ngày trong tuần từ Thứ Hai đến Chủ Nhật
        const allWeekDays = [];
        for (let day = startDate.clone(); day.isSameOrBefore(endDate, 'day'); day.add(1, 'day')) {
            allWeekDays.push(day.clone());
        }
    
    
        // Tạo danh sách điểm danh trong tuần
        const weekAttendances = allWeekDays.map(day => {
            const attendance = attendances.find(a => moment(a.date).isSame(day, 'day')); // So sánh ngày
            return {
                date: day.format('YYYY-MM-DD'), // Chuẩn hóa định dạng ngày
                isAttendance: attendance ? attendance.isAttendance : false // Nếu không có điểm danh thì false
            };
        });
    
    
        // Định dạng dữ liệu trả về
        const weeklyAttendance = {
            weekStart: startDate.format('YYYY-MM-DD'), // Ngày bắt đầu tuần
            weekEnd: endDate.format('YYYY-MM-DD'),     // Ngày kết thúc tuần
            attendances: weekAttendances              // Danh sách điểm danh
        };
    
        return { data: weeklyAttendance };
    }
    

    
    // 2. Điểm danh thủ công (POST request để lưu điểm danh cho người dùng)
    async markAttendanceService(userId: string, isAttendance: boolean): Promise<Attendance> {
        // Lấy thời gian đầu ngày và cuối ngày hôm nay
        const startOfToday = moment().startOf('day').toDate(); // 00:00:00.000 hôm nay
        const endOfToday = moment().endOf('day').toDate();     // 23:59:59.999 hôm nay
    
        // Lấy giá trị điểm khuyến mãi
        const pointPromo = await this.getValueToPromotion();
    
        // Kiểm tra xem người dùng đã có điểm danh trong khoảng thời gian này chưa
        const existingAttendance = await this.attendanceModel.findOne({
            userId,
            date: { $gte: startOfToday, $lte: endOfToday } // Lọc trong phạm vi ngày
        });
    
        if (existingAttendance) {
            throw new BadRequestException('Attendance already marked for today');
        } else {
            // Nếu chưa có, tạo mới bản ghi điểm danh
            await this.WalletService.addPointForOutService(userId, pointPromo);
            const newAttendance = new this.attendanceModel({
                userId,
                date: new Date(), // Lưu thời gian hiện tại (theo UTC)
                isAttendance,
            });
            return newAttendance.save();
        }
    }
    
}
