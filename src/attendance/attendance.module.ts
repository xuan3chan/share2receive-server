import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Attendance,
  AttendanceSchema,
  Configs,
  ConfigsSchema,
  User,
  UserSchema,
} from '@app/libs/common/schema';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  imports: [
    WalletModule,
    MongooseModule.forFeature([
      {
        name: Attendance.name,
        schema: AttendanceSchema,
      },
      { name: User.name, schema: UserSchema },
      { name: Configs.name, schema: ConfigsSchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
