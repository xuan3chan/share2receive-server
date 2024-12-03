import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Evidence, EvidenceDocument } from '@app/libs/common/schema';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class EvidenceService {
  constructor(
    @InjectModel(Evidence.name) private evidenceModel: Model<EvidenceDocument>,
  ) {}

  /**
   * Lưu file vào server
   */
  private saveFileToServer(file: Express.Multer.File): string {
    const uploadDir = join(__dirname, '..', 'uploads'); // Đường dẫn thư mục lưu tệp

    // Kiểm tra thư mục, nếu chưa có thì tạo
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Lưu file
    const filePath = join(uploadDir, `${Date.now()}-${file.originalname}`);
    fs.writeFileSync(filePath, file.buffer);
    return filePath; // Trả về đường dẫn file
  }

  /**
   * Tạo Evidence và xử lý upload file
   */
  async createEvidence(data: any, file?: Express.Multer.File): Promise<Evidence> {
    if (file) {
      // Lưu file vào server và thêm đường dẫn vào dữ liệu Evidence
      const filePath = this.saveFileToServer(file);
      data.fileEvidence = filePath; // Thêm đường dẫn file vào data
    }

    const evidence = new this.evidenceModel(data);
    return evidence.save();
  }
}
