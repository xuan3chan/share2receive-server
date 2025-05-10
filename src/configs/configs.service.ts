import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Configs, ConfigsDocument } from '@app/libs/common/schema/config.schema';
import { UpdateConfigDto } from '@app/libs/common/dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import * as _ from 'lodash';

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

  async initConfigs() {
    let config = await this.configModel.findOne().lean();
    if (!config) {
      config = await this.configModel.create({
        sectionUrl_1: '',
        sectionUrl_2: '',
        videoUrl_1: '',
        videoUrl_2: '',
        valueToPoint: 1000,
        valueToPromotion: 2,
        valueToCross: 5,
        reportWarning: 3,
        reprotBlockerProduct: 5,
        reportBlockUser: 7,
        detailSuport: {
          title_1: '',
          content_1: '',
          title_2: '',
          content_2: '',
          title_3: '',
          content_3: '',
        },
        paymentMethod: {
          momoPayment: true,
          bonusPayment: true,
          CODPayment: true,
        },
        userCan: {
          userCanBuy: true,
          userCanSell: true,
          userCanExchange: true,
          userCanDonate: true,
        },
      });
    }
    return config;
  }

  async getConfigs() {
    let config = await this.configModel.findOne().lean();
    if (!config) {
      config = await this.initConfigs();
    }
    return config;
  }

  async updateConfigsService(id: string, updateConfigDto: UpdateConfigDto) {
    const current = await this.configModel.findById(id);
    if (!current) throw new NotFoundException('Config not found');

    // Deep merge để giữ lại các object lồng nhau
    _.merge(current, updateConfigDto);
    await current.save();

    return current.toObject();
  }

  async updateSessionUrl(id: string, type: string, file: Express.Multer.File) {
    const validFields = ['sectionUrl_1', 'sectionUrl_2', 'videoUrl_1', 'videoUrl_2'];
    if (!validFields.includes(type)) {
      throw new BadRequestException(`Invalid field type: ${type}`);
    }

    let url: string = '';
    if (file) {
      try {
        await this.cloudinaryService.deleteMediaService(type);
      } catch {
        console.warn('Delete image old failed in ConfigsService');
      }

      const timestamp = Date.now();
      const imgName = `${type}_${timestamp}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '')}`;

      const resultImg = await this.cloudinaryService.uploadImageService(imgName, file);
      if (resultImg?.uploadResults?.[0]?.url) {
        url = resultImg.uploadResults[0].url;
      } else {
        throw new BadRequestException('Upload failed, no URL returned.');
      }
    }

    const updateField = { [type]: url };
    const config = await this.configModel
      .findByIdAndUpdate(id, { $set: updateField }, { new: true, upsert: true })
      .lean();

    return config;
  }
}
