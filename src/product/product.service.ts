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
    // plus totalProduct in brand
        await this.brandModel.findByIdAndUpdate(
      product.brandId,
      { $inc: { totalProduct: 1 } }
    ).exec();
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
      const productDelete = await this.productModel.findOneAndUpdate(
        {
          _id: productId,
          userId,
        },
        {
          $set: {
            isDeleted: true,
          },
        },
        { new: true } // Return the updated document
      );
  
      if (!productDelete) {
        throw new BadRequestException('Product not found or not owned by user');
      }
  
      await this.brandModel.findByIdAndUpdate(
        productDelete.brandId,
        { $inc: { totalProduct: -1 } }
      ).exec();
  
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

  //*****************manage product***************** */
  async listProductForAdminService(
    page: number,
    limit: number,
    searchKey?: string,
    sortField: string = 'productName',
    sortOrder: 'asc' | 'desc' = 'asc',
    filterField?: string,  // Trường để lọc
    filterValue?: string,  // Giá trị lọc
  ): Promise<{ total: number; products: any[] }> {
    // Tạo query tìm kiếm theo tên sản phẩm
    const query: any = {
      productName: { $regex: searchKey || '', $options: 'i' },
    };
  
    // Áp dụng filterField và filterValue nếu có
    if (filterField && filterValue) {
      query[filterField] = filterValue; // Gán filterField với filterValue vào query
    }
  
    // Đếm tổng số sản phẩm phù hợp với query
    const total = await this.productModel.countDocuments(query).exec();
  
    // Truy vấn danh sách sản phẩm dựa trên query, sắp xếp và phân trang
    const products = await this.productModel
      .find(query)
      .populate('categoryId', 'name')
      .populate('brandId', 'name')
      .populate('userId', 'firstname lastname')
      .select('-createdAt -updatedAt -__v -sizeVariants -approved._id')
      .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 }) // Sắp xếp theo sortField và sortOrder
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true }) // Trả về plain objects thay vì Mongoose documents
      .exec();
  
    // Tái cấu trúc dữ liệu để loại bỏ các object lồng bên trong
    const structuredProducts = products.map(product => ({
      _id: product._id,
      productName: product.productName,
      imgUrls: product.imgUrls,
      material: product.material,
      userId: (product.userId as any)._id,
      userName: `${(product.userId as any).firstname} ${(product.userId as any).lastname}`, // Ghép tên người dùng
      categoryName: (product.categoryId as any).name, // Lấy category name ra ngoài
      brandName: (product.brandId as any ).name, // Lấy brand name ra ngoài
      approved: product.approved,
      isDeleted: product.isDeleted,
      status: product.status,
      isBlock: product.isBlock,
      type: product.type,
      price: product.price,
      priceNew: product.priceNew,
      tags: product.tags,
    }));
  
    return { total, products: structuredProducts };
  }
  
  
  
  
}
