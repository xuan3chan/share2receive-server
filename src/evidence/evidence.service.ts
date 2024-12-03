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

@Injectable()
export class EvidenceService {
  constructor(
    @InjectModel(Evidence.name) private evidenceModel: Model<EvidenceDocument>,
    @InjectModel('Admin') private adminModel: Model<AdminsDocument>,
  ) {}

  /**
   * Lưu file vào server
   */
  private saveFileToServer(file: Express.Multer.File): string {
    if (!file) {
      throw new Error('File is undefined');
    }

    // Kiểm tra định dạng file
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel
      'application/vnd.ms-excel', // Excel
      'application/msword', // Word
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word
      'application/pdf',
      
      

    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(
        'Invalid file type. Only Excel and Word files are allowed.',
      );
    }

    const uploadDir = join(__dirname, '..', 'uploads'); // Đường dẫn thư mục lưu tệp

    // Kiểm tra thư mục, nếu chưa có thì tạo
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Lưu file
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = join(uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Trả về URL để truy cập tệp
    return `/files/${fileName}`;
  }

  /**
   * Tạo Evidence và xử lý upload file
   */
  async createEvidenceService(
    userId: string,
    file: Express.Multer.File,
    type: string,
    description?: string,
  ): Promise<Evidence> {
    const fileUrl = this.saveFileToServer(file); // Lưu file và nhận URL
    const admin = await this.adminModel
      .findById(userId)
      .select('adminName')
      .lean(); // Lấy thông tin admin

    if (!admin) {
      throw new Error('Admin not found'); // Xử lý lỗi nếu không tìm thấy admin
    }

    const newEvidence = new this.evidenceModel({
      batchUUID: null, // Sẽ được tự động tạo thông qua middleware `pre('save')`
      fileExport: fileUrl, // URL của file
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

    // Lưu file mới
    const newFileUrl = this.saveFileToServer(file);

    // Cập nhật evidence dựa trên type
    const updateData =
      type === 'fileExport'
        ? { fileExport: newFileUrl }
        : { fileEvidence: newFileUrl };

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

  async getEvidenceService(): Promise<Evidence[]> {
    const evidences = await this.evidenceModel.find().lean(); // Lấy danh sách evidence

    const domain = process.env.DOMAIN || 'https://share2receive-server.onrender.com'; // Domain của server
  
    return evidences.map((evidence) => ({
      ...evidence,
      fileExport: evidence.fileExport
        ? `${domain}${evidence.fileExport}`
        : null,
      fileEvidence: evidence.fileEvidence
        ? `${domain}${evidence.fileEvidence}`
        : null,
    }));
  }
  
}
