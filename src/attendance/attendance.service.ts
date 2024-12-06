import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from '@app/libs/common/schema/attendance.schema';
import { User, UserDocument } from '@app/libs/common/schema/user.schema';
import * as moment from 'moment';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class AttendanceService {
    constructor(
        @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        private readonly WalletService: WalletService
    ) {}

    async getWeeklyAttendanceService(userId: string): Promise<any> {
        // Lấy ngày hiện tại
        const currentDate = moment();
    
        // Lấy startDate (Thứ Hai của tuần hiện tại)
        const startDate = currentDate.clone().isoWeekday(1);  // Thứ Hai
        // Lấy endDate (Chủ Nhật của tuần hiện tại)
        const endDate = currentDate.clone().isoWeekday(7);  // Chủ Nhật
    
        console.log('Start Date (Local):', startDate.toISOString());
        console.log('End Date (Local):', endDate.toISOString());
    
        // Lấy tất cả các điểm danh của người dùng trong tuần hiện tại
        const attendances = await this.attendanceModel.find({
            userId,
            date: { $gte: startDate.toDate(), $lte: endDate.toDate() }
        }).exec();
    
        // Duyệt qua tuần (chỉ có tuần hiện tại)
        const weekStart = startDate.clone();
        const weekEnd = endDate.clone();
        console.log('Week Start (Local):', weekStart.format('yy/MM/DD'), 'Week End (Local):', weekEnd.format('yy/MM/DD'));
    
        // Tạo mảng các ngày trong tuần từ startDate đến endDate
        const allWeekDays = [];
        for (let day = weekStart.clone(); day.isBefore(weekEnd.clone().add(1, 'day'), 'day'); day.add(1, 'day')) {
            allWeekDays.push(day.format('yy/MM/DD'));
        }
    
        // Lọc điểm danh trong tuần và kiểm tra ngày nào chưa có
        const weekAttendances = allWeekDays.map(day => {
            const attendance = attendances.find(a => moment(a.date).format('yy/MM/DD') === day);
            return {
                date: day,
                isAttendance: attendance ? attendance.isAttendance : false  // Nếu không có điểm danh thì false
            };
        });
    
        // Thêm tuần và điểm danh vào đối tượng
        const weeklyAttendance = {
            weekStart: weekStart.format('yy/MM/DD'),
            weekEnd: weekEnd.format('yy/MM/DD'),
            attendances: weekAttendances
        };
    
        return { data: weeklyAttendance };
    }

    
    // 2. Điểm danh thủ công (POST request để lưu điểm danh cho người dùng)
    async markAttendanceService(userId: string, isAttendance: boolean): Promise<Attendance> {
        // Lấy ngày hiện tại (ngày hôm nay)
        const attendanceDate = moment().startOf('day').toDate(); // Start of the day để đảm bảo không có thời gian
    
        // Kiểm tra xem người dùng đã có điểm danh cho ngày này chưa
        const existingAttendance = await this.attendanceModel.findOne({ userId, date: attendanceDate });
        
        if (existingAttendance) {
            throw new BadRequestException('Attendance already marked for today');
        } else {
            // Nếu chưa có, tạo mới bản ghi điểm danh
            this.WalletService.addPointService(userId, 2);
            const newAttendance = new this.attendanceModel({
                userId,
                date: attendanceDate,
                isAttendance,
            });
            return newAttendance.save();
        }
    }
    
}
