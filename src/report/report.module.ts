import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportSchema,Report } from '@app/libs/common/schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
  ]),],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
