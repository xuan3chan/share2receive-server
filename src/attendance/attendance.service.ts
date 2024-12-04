import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from '@app/libs/common/schema/attendance.schema';
import { User, UserDocument } from '@app/libs/common/schema/user.schema';
import * as moment from 'moment';

@Injectable()
export class AttendanceService {
    constructor(
        @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    ) {}

    // 1. Lấy điểm danh của người dùng trong tuần của tháng
    async getWeeklyAttendanceService(userId: string, month: number, year: number): Promise<any[]> {
        // Lấy ngày đầu và ngày cuối của tháng
        const startDate = moment.utc().year(year).month(month - 1).startOf('month').startOf('day'); // Bắt đầu từ 00:00:00 UTC
        const endDate = moment.utc(startDate).endOf('month').endOf('day'); // Kết thúc ở 23:59:59 UTC
    
        // Lấy tất cả các ngày trong tháng từ startDate đến endDate
        const daysInMonth = [];
        for (let date = startDate; date.isBefore(endDate, 'day'); date.add(1, 'days')) {
            daysInMonth.push(date.clone()); // Thêm một bản sao của ngày vào mảng
        }
    
        // Lấy dữ liệu điểm danh của người dùng trong tháng
        const attendances = await this.attendanceModel.find({
            userId: userId,
            date: { $gte: startDate.toDate(), $lte: endDate.toDate() },
        });
        console.log('daysInMonth', daysInMonth.map(day => day.toDate()))
        console .log('attendances',attendances)
        // Nhóm các ngày theo tuần trong tháng
        const weeksInMonth = [];
        let currentWeek = [];
    
        daysInMonth.forEach((day, index) => {
            // Kiểm tra nếu là ngày đầu tuần (Thứ 2) và tuần hiện tại có ngày
            if (day.isoWeekday() === 1 && currentWeek.length > 0) {
                weeksInMonth.push(currentWeek); // Lưu tuần hiện tại vào mảng
                currentWeek = []; // Bắt đầu tuần mới
            }
    
            // Thêm ngày vào tuần hiện tại
            currentWeek.push(day);
    
            // Nếu là ngày cuối tuần (Chủ nhật), lưu tuần vào mảng và bắt đầu tuần mới
            if (day.isoWeekday() === 7) {
                weeksInMonth.push(currentWeek); // Lưu tuần vào mảng
                currentWeek = []; // Bắt đầu tuần mới
            }
    
            // Nếu là ngày cuối cùng trong tháng và còn ngày trong tuần, lưu tuần còn lại
            if (index === daysInMonth.length - 1 && currentWeek.length > 0) {
                weeksInMonth.push(currentWeek);
            }
        });
    
        // Trả về mảng điểm danh theo từng ngày trong các tuần
        const weeklyAttendance = weeksInMonth.map(week => {
            return week.map((day: moment.Moment) => {
                // Kiểm tra sự khớp giữa ngày hiện tại và điểm danh
                const attendanceForDay = attendances.find(attendance =>
                    moment.utc(attendance.date).startOf('day').isSame(day.startOf('day'), 'day') // Đảm bảo so khớp chỉ ngày theo UTC
                );
                return {
                    date: day.format('DD/MM/YYYY'),
                    isAttendance: attendanceForDay ? attendanceForDay.isAttendance : false,
                };
            });
        });
        
        return weeklyAttendance;
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
            const newAttendance = new this.attendanceModel({
                userId,
                date: attendanceDate,
                isAttendance,
            });
            return newAttendance.save();
        }
    }
    

    // 3. Lấy danh sách tất cả người dùng (cho mục đích điểm danh toàn hệ thống)
    async getUsers(): Promise<User[]> {
        return this.userModel.find().exec();
    }

    // 4. Lấy điểm danh của tất cả người dùng trong tuần (dành cho quản trị viên)
    async getAllUsersWeeklyAttendance(month: number, year: number): Promise<any[]> {
        const users = await this.getUsers();
        const weeklyAttendancePromises = users.map(user =>
            this.getWeeklyAttendanceService(user._id.toString(), month, year)
        );
        
        // Đồng thời lấy điểm danh của tất cả người dùng trong tuần
        const weeklyAttendances = await Promise.all(weeklyAttendancePromises);
        return weeklyAttendances;
    }
}
