import { BadRequestException, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Category, Product } from '@app/libs/common/schema';
import { InjectModel } from '@nestjs/mongoose';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@app/libs/common/dto/category.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    private cloudinaryService: CloudinaryService
  ) {}

  async createCategoryService(
    createCategoryDto: CreateCategoryDto,file: Express.Multer.File,
  ): Promise<Category> {
    const category = await this.categoryModel
      .findOne({
        name: createCategoryDto.name,
      })
      .exec();
    if (category) {
      throw new BadRequestException('Category already exists');
    }
    const imgUrl= this.cloudinaryService.uploadImageService(createCategoryDto.name, file);
    const newCategory = new this.categoryModel(createCategoryDto);
    newCategory.imgUrl = (await imgUrl).uploadResults[0].url;
    return newCategory.save();
  }
     async updateCategoryService(
      id: string,
      updateCategoryDto: UpdateCategoryDto,
      file: Express.Multer.File,
    ): Promise<Category> {
      try {
        // Check for duplicate category name
        const categoryDuplicate = await this.categoryModel
          .findOne({ name: updateCategoryDto.name })
          .exec();
        if (categoryDuplicate && categoryDuplicate._id.toString() !== id) {
          throw new BadRequestException('Category already exists');
        }
  
        // Update the category
        const cateUpdate = await this.categoryModel
          .findByIdAndUpdate(id, updateCategoryDto, { new: true })
          .exec();
    
        // Update image if file is provided
        if (file) {
          const imgUrl = await this.cloudinaryService.uploadImageService(
            cateUpdate.name,
            file,
          );
          cateUpdate.imgUrl = imgUrl.uploadResults[0].url;
          await cateUpdate.save(); // Save the updated category with the new image URL
        }
    
        return cateUpdate;
      } catch (error) {
        // Handle the error appropriately
        throw new BadRequestException(
          error.message || 'Failed to update category',
        );
      }
    }
  async deleteCategoryService(id: string): Promise<Category> {
    const product = await this.productModel.findOne({ categoryId: id }).exec();
    if (product) {
      throw new BadRequestException('Category is in use');
    }
    const category = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!category) {
      throw new BadRequestException('Category not exists');
    }
    return category;
  }
  async viewListCategoryService(
    page: number,
    limit: number,
    searchKey?: string,
    sortField: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<{ total: number; category: Category[] }> {
    const query = {};
    if (searchKey) {
      query['name'] = { $regex: searchKey, $options: 'i' };
    }
    const total = await this.categoryModel.countDocuments(query).exec();
    const category = await this.categoryModel
      .find(query)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    return { total, category };
  }
  async listCategoryForClientService(): Promise<Category[]> {
    //get cái nào status = active
    return this.categoryModel.find({ status: 'active' }).lean().exec();
  }
}
