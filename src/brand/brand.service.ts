import { BadRequestException, Injectable } from '@nestjs/common';
import { Brand } from '@app/libs/common/schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateBrandDto, UpdateBrandDto } from '@app/libs/common/dto/brand.dto';

@Injectable()
export class BrandService {
  constructor(@InjectModel(Brand.name) private brandModel: Model<Brand>) {}

  async createBrandService(createBrandDto: CreateBrandDto): Promise<Brand> {
    const brand = await this.brandModel
      .findOne({
        name: createBrandDto.name,
      })
      .exec();
    if (brand) {
      throw new BadRequestException('Brand already exists');
    }
    const newBrand = new this.brandModel(createBrandDto);
    return newBrand.save();
  }
  async updateBrandService(
    id: string,
    updateBrandDto: UpdateBrandDto,
  ): Promise<Brand> {
    try {
      // Check for duplicate brand name
      const brandDuplicate = await this.brandModel
        .findOne({ name: updateBrandDto.name })
        .exec();
      if (brandDuplicate && brandDuplicate._id.toString() !== id) {
        throw new BadRequestException('Brand already exists');
      }
      return this.brandModel
        .findByIdAndUpdate(id, updateBrandDto, { new: true })
        .exec();
    } catch (error) {
      // Handle the error appropriately
      throw new BadRequestException(error.message || 'Failed to update brand');
    }
  }
  async deleteBrandService(id: string): Promise<Brand> {
    const product = await this.brandModel.findOne({ brandId: id }).exec();
    if (product) {
      throw new BadRequestException('Brand is in use');
    }
    const brand = await this.brandModel.findByIdAndDelete(id).exec();
    if (!brand) {
      throw new BadRequestException('Brand not exists');
    }
    return brand;
  }

  async viewListBrandService(
    page: number,
    limit: number,
    searchKey?: string,
    sortField: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<{ total: number; brand: Brand[] }> {
    const query = {};
    if (searchKey) {
      query['name'] = { $regex: searchKey, $options: 'i' };
    }
    const brand = await this.brandModel
      .find(query)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const total = await this.brandModel.countDocuments(query).exec();
    return { total, brand };
  }

  async listBrandForClientService(): Promise<Brand[]> {
    return this.brandModel.find({ status: 'active' }).exec();
  }
}
