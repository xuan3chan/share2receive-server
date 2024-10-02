import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Brand,
  BrandDocument,
  Category,
  CategoryDocument,
  Product,
  ProductDocument,
} from '@app/libs/common/schema';
import { CreateProductDto, UpdateProductDto } from '@app/libs/common/dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Brand.name) private readonly brandModel: Model<BrandDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createProductService(
    userId: string,
    product: CreateProductDto,
  ): Promise<Product> {
    try {
      const [checkExist, checkCategory, checkBrand] = await Promise.all([
        this.productModel.findOne({ productName: product.productName }),
        product.categoryId
          ? this.categoryModel.findById(product.categoryId)
          : null,
        product.brandId ? this.brandModel.findById(product.brandId) : null,
      ]);

      if (checkExist) {
        throw new BadRequestException('Product already exists');
      }
      if (product.categoryId && !checkCategory) {
        throw new BadRequestException('Category not found');
      }
      if (product.brandId && !checkBrand) {
        throw new BadRequestException('Brand not found');
      }

      // Create a new product and assign the uploaded image URLs
      const newProduct = new this.productModel({
        ...product, // Spread the product fields
        userId, // Assign the userId
      });

      return await newProduct.save();
    } catch (error) {
      // Handle any other errors
      throw new BadRequestException(error.message);
    }
  }

  async uploadProductImages(
    userId: string,
    productId: string,
    files: Express.Multer.File[],
  ): Promise<void> {
    try {
      const product = await this.productModel.findOne({
        _id: productId,
        userId,
      });

      if (!product) {
        throw new BadRequestException('Product not found');
      }
      // Upload the images to Cloudinary
      const imageUrls = await this.cloudinaryService.uploadImageService(
        product.productName,
        files,
      );
      // Assign the uploaded image URLs to the product
      product.imgUrls = imageUrls.uploadResults.map(
        (result) => result.secure_url,
      );

      await product.save();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async deleteImageService(
    userId: string,
    productId: string,
    publicIds: string[], // Nhận mảng publicIds trực tiếp từ client
  ): Promise<void> {
    try {
      // Tìm sản phẩm dựa trên productId và userId
      const product = await this.productModel.findOne({
        _id: productId,
        userId,
      });

      if (!product) {
        throw new BadRequestException('Product not found');
      }
      product.imgUrls = product.imgUrls.filter((imgUrl) => {
        // Kiểm tra xem imgUrl có nằm trong danh sách publicIds cần xóa không
        return !publicIds.includes(imgUrl);
      });
      this.cloudinaryService.deleteManyImagesService(publicIds);
      await product.save();
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to delete images');
    }
  }
  async updateProductService(
    userId: string,
    productId: string,
    product: UpdateProductDto,
  ): Promise<Product> {
    try {
      const [checkCategory, checkBrand] = await Promise.all([
        product.categoryId
          ? this.categoryModel.findById(product.categoryId)
          : null,
        product.brandId ? this.brandModel.findById(product.brandId) : null,
      ]);

      if (product.categoryId && !checkCategory) {
        throw new BadRequestException('Category not found');
      }
      if (product.brandId && !checkBrand) {
        throw new BadRequestException('Brand not found');
      }

      if (product.productName) {
        const checkExist = await this.productModel.findOne({
          productName: product.productName,
        });
        if (checkExist && checkExist._id.toString() !== productId) {
          throw new BadRequestException(
            'Product with this name already exists',
          );
        }
      }

      const updatedProduct = await this.productModel.findByIdAndUpdate(
        {
          _id: productId,
          userId,
        },
        {
          $set: product,
        },
        { new: true },
      );

      if (!updatedProduct) {
        throw new BadRequestException('Product not found');
      }

      return updatedProduct;
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to update product',
      );
    }
  }
  async deleteProductService(
    userId: string,
    productId: string,
  ): Promise<{ message: string }> {
    try {
      await this.productModel.findOneAndUpdate(
        {
          _id: productId,
          userId,
        },
        {
          $set: {
            isDeleted: true,
          },
        },
      );
      return { message: 'Product deleted successfully' };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to delete product',
      );
    }
  }
  async updateStatusService(
    userId: string,
    productId: string,
    status: string,
  ): Promise<{ message: string }> {
    try {
      await this.productModel.findOneAndUpdate(
        {
          _id: productId,
          userId,
        },
        {
          $set: {
            status,
          },
        },
      );
      return { message: 'Product status updated successfully' };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to update product status',
      );
    }
  }
 async listProductService(
  userId?: string,
  page?: number,
  limit?: number,
  searchKey?: string,
  sortField: string = 'lastname',
  sortOrder: 'asc' | 'desc' = 'asc',
): Promise<{ data: any; total: number }> {
  try {
    const query: any = {
      isDeleted: false,
      productName: {
        $regex: searchKey || '',
        $options: 'i',
      },
    };

    if (userId) {
      query.userId = userId;
    }

    const [data, total] = await Promise.all([
      this.productModel
        .find(query)
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(query),
    ]);

    return { data, total };
  } catch (error) {
    throw new BadRequestException(error.message || 'Failed to get products');
  }
}
}
