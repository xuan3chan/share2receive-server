import { BadRequestException, Injectable } from '@nestjs/common';
import { Configs } from '@app/libs/common/schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigsDocument } from '@app/libs/common/schema/config.schema';
import { UpdateConfigDto } from '@app/libs/common/dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class ConfigsService {
  constructor(
    @InjectModel(Configs.name)
    private readonly configModel: Model<ConfigsDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async onModuleInit() {
    await this.initConfigs();
  }
  // Khởi tạo cấu hình nếu chưa tồn tại
  async initConfigs() {
    let config = await this.configModel.findOne().lean();

    if (!config) {
      // Tạo cấu hình mặc định nếu chưa có
      config = await this.configModel.create({
        sectionUrl_1: '',
        sectionUrl_2: '',
        videoUrl_1: '',
        videoUrl_2: '',
        valueToPoint: 0,
        valueToPromotion: 0,
        reportWarning: 0,
        reprotBlockerProduct: 0,
        reportBlockUser: 0,
        detailSuport: {
          title_1: '',
          content_1: '',
          title_2: '',
          content_2: '',
          title_3: '',
          content_3: '',
        },
      });
    }

    return config;
  }

  // Lấy cấu hình
  async getConfigs() {
    let config = await this.configModel.findOne().lean();

    // Nếu không có, khởi tạo cấu hình
    if (!config) {
      config = await this.initConfigs();
    }

    return config;
  }

  // Cập nhật cấu hình
  async updateConfigsService(id: string, updateConfigDto: UpdateConfigDto) {
    // Cập nhật cấu hình dựa trên ID hoặc tạo mới nếu không tìm thấy
    const config = await this.configModel
      .findByIdAndUpdate(id, updateConfigDto, { new: true, upsert: true })
      .lean();

    return config;
  }

  async updateSessionUrl(id: string, type: string, file: Express.Multer.File) {
    let url: string = '';
  
    if (file) {
      // Tạo tên file an toàn và duy nhất
      try{
        await this.cloudinaryService.deleteMediaService(type);
      }catch{
        console.log('Delete image old failed in configservice');
      }

      const timestamp = Date.now();
      const imgName = `${type}_${timestamp}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '')}`;
  
      // Upload file lên Cloudinary
      const resultImg = await this.cloudinaryService.uploadImageService(
        imgName,
        file,
      );
  
      // Kiểm tra kết quả trả về từ Cloudinary
      if (resultImg?.uploadResults?.[0]?.url) {
        url = resultImg.uploadResults[0].url;
      } else {
        throw new BadRequestException('Upload failed, no URL returned.');
      }
    }
  
    // Cập nhật URL hình ảnh vào trường cụ thể dựa trên "type"
    const updateField = { [type]: url }; // Sử dụng computed key
  
    // Cập nhật vào MongoDB
    const config = await this.configModel
      .findByIdAndUpdate(id, { $set: updateField }, { new: true, upsert: true })
      .lean();
  
    return config;
  }
  
}
