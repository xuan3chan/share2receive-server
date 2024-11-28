import { BadRequestException, Injectable } from '@nestjs/common';
import { Report } from '@app/libs/common/schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateReportDto } from '@app/libs/common/dto';


@Injectable()
export class ReportService {
    constructor(
        @InjectModel('Report') private readonly reportModel: Model<Report>,
    ) {}

    async createReport(createReportDto:CreateReportDto): Promise<Report> {
        try {
            const { reportType, targetId, reason, description } = createReportDto;
            const report = new this.reportModel({
                reportType,
                targetId,
                reason,
                description,
            });
            return await report.save();
        } catch (error) {
            console.error('Error creating report:', error);
            throw new BadRequestException(error.message);
        }
}
}