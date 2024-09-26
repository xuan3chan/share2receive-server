import { BadRequestException, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Category } from '@app/libs/common/schema';
import { InjectModel } from '@nestjs/mongoose';
import { CreateCategoryDto, UpdateCategoryDto } from '@app/libs/common/dto/category.dto';

@Injectable()
export class CategoryService {
    constructor(
        @InjectModel(Category.name) private categoryModel: Model<Category>
    ) {}

    async createCategoryService(createCategoryDto: CreateCategoryDto): Promise<Category> {
        const category = await this.categoryModel
            .findOne({
                name: createCategoryDto.name
            })
            .exec();
        if (category) {
            throw new BadRequestException('Category already exists');
        }
        const newCategory = new this.categoryModel(
            createCategoryDto
        );
        return newCategory.save();
    }
    async updateCategoryService(id:string,updateCategoryDto: UpdateCategoryDto): Promise<Category> {
        try {
            // Check for duplicate category name
            const categoryDuplicate = await this.categoryModel.findOne({ name
                : updateCategoryDto.name }).exec();
            if (categoryDuplicate && categoryDuplicate._id.toString() !== id) {
                throw new BadRequestException('Category already exists');
            }
            return this.categoryModel.findByIdAndUpdate
                (id, updateCategoryDto, { new: true })
                .exec();
        } catch (error) {
            // Handle the error appropriately
            throw new BadRequestException(error.message || 'Failed to update category');
        }
    }
    async deleteCategoryService(id: string): Promise<Category> {
        const category = await this.categoryModel.findByIdAndDelete(id).exec();
        if (!category) {
            throw new BadRequestException('Category not exists');
        }
        return category;
    }
    async viewListCategoryService(
        page:number,
        limit:number,
        searchKey?:string,
        sortField:string = 'name',
        sortOrder: 'asc' | 'desc' = 'asc',
        
    ): Promise<{total:number;category:Category[]}> {
        const query = {};
        if (searchKey) {
            query['name'] = { $regex: searchKey, $options: 'i' };
        }
        const total = await this.categoryModel.countDocuments(query).exec();
        const category = await this.categoryModel.find(query)
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
