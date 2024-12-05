import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AdminsDocument,
  Evidence,
  EvidenceDocument,
} from '@app/libs/common/schema';
import { join } from 'path';
import * as fs from 'fs';
import { DropboxService } from 'src/dropbox/dropbox.service';

@Injectable()
export class EvidenceService {
  constructor(
    @InjectModel(Evidence.name) private evidenceModel: Model<EvidenceDocument>,
    @InjectModel('Admin') private adminModel: Model<AdminsDocument>,
    private readonly dropboxService: DropboxService,
  ) {}

  async createEvidenceService(
    userId: string,
    file: Express.Multer.File,
    type: string,
    description?: string,
  ): Promise<Evidence> {
    const fileEx = await this.dropboxService.uploadFile(file); // Lưu file và nhận URL
    const admin = await this.adminModel
      .findById(userId)
      .select('adminName')
      .lean(); // Lấy thông tin admin

    if (!admin) {
      throw new BadRequestException('Admin not found'); // Xử lý lỗi nếu không tìm thấy admin
    }

    const newEvidence = new this.evidenceModel({
      batchUUID: null, // Sẽ được tự động tạo thông qua middleware `pre('save')`
      fileExportPath: fileEx.path_display,
      fileExportId: fileEx.id,
      type: type, // hoặc 'paymentPeriod', bạn có thể thay đổi theo logic cụ thể
      shall: {
        decisionBy: admin.adminName,
        description: description || 'Evidence created by admin',
        date: new Date(),
      },
    });

    return await newEvidence.save(); // Lưu Evidence và trả về dữ liệu đã lưu
  }
  async updateEvidenceService(
    evidenceId: string,
    file: Express.Multer.File,
    type: string,
  ): Promise<Evidence> {
    const evidence = await this.evidenceModel.findById(evidenceId).lean(); // Lấy thông tin evidence

    if (!evidence) {
      throw new BadRequestException('Evidence not found'); // Xử lý lỗi nếu không tìm thấy evidence
    }

    // Đường dẫn file cũ (tùy theo type)
    const oldFileUrl =
      type === 'fileExport' ? evidence.fileExport : evidence.fileEvidence;

    // Xóa file cũ nếu tồn tại
    if (oldFileUrl) {
      const oldFilePath = join(
        __dirname,
        '..',
        'uploads',
        oldFileUrl.split('/').pop(),
      );
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath); // Xóa file cũ
      }
    }
    if (type === 'fileExport' && evidence.fileExportPath) {
      // Xóa file trên Dropbox
      await this.dropboxService.deleteFile(evidence.fileExportPath);
    } else if (evidence.fileEvidencePath) {
      // Xóa file trên Dropbox
      await this.dropboxService.deleteFile(evidence.fileEvidencePath);
    }

    // Lưu file mới
    const newFile = await this.dropboxService.uploadFile(file);
    const path_display = newFile.path_display;
    const id = newFile.id;

    // Cập nhật evidence dựa trên type
    const updateData = {
      [type === 'fileExport' ? 'fileExportPath' : 'fileEvidencePath']:
        path_display,
      [type === 'fileExport' ? 'fileExportId' : 'fileEvidenceId']: id,
    };
    const updatedEvidence = await this.evidenceModel.findByIdAndUpdate(
      evidenceId,
      updateData,
      { new: true },
    );

    if (!updatedEvidence) {
      throw new BadRequestException('Error while updating evidence');
    }

    return updatedEvidence;
  }

  async getEvidenceService(
    page: number,
    limit: number,
    filterBy?: string,
    filterValue?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<{
    evidences: Evidence[];
    pagination: { currentPage: number; totalPages: number; total: number };
  }> {
    const skip = (page - 1) * limit;

    const filter = filterBy && filterValue ? { [filterBy]: filterValue } : {};

    const total = await this.evidenceModel.countDocuments(filter);

    const evidences = await this.evidenceModel
      .find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const domain =
      process.env.DOMAIN || 'https://share2receive-server.onrender.com';

    const formattedEvidences = evidences.map((evidence) => ({
      ...evidence,
      fileExport: evidence.fileExport
        ? `${domain}${evidence.fileExport}`
        : null,
      fileEvidence: evidence.fileEvidence
        ? `${domain}${evidence.fileEvidence}`
        : null,
    }));

    return {
      evidences: formattedEvidences,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total: total,
      },
    };
  }
}
