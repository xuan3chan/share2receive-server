import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Brand,
  BrandDocument,
  Category,
  CategoryDocument,
  Product,
  ProductDocument,
  User,
  UserDocument,
} from '@app/libs/common/schema';
import { CreateProductDto, UpdateProductDto } from '@app/libs/common/dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { MailerService } from 'src/mailer/mailer.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Brand.name) private readonly brandModel: Model<BrandDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mailerService: MailerService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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
      await this.brandModel
        .findByIdAndUpdate(product.brandId, { $inc: { totalProduct: 1 } })
        .exec();
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
  
      // Prepend the uploaded image URLs to the existing imgUrls array
      const newImageUrls = imageUrls.uploadResults.map((result) => result.secure_url);
      product.imgUrls = [...newImageUrls, ...product.imgUrls];
  
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
        product.categoryId ? this.categoryModel.findById(product.categoryId) : null,
        product.brandId ? this.brandModel.findById(product.brandId) : null,
      ]);
  
      if (product.categoryId && !checkCategory) {
        throw new BadRequestException('Category not found');
      }
      if (product.brandId && !checkBrand) {
        throw new BadRequestException('Brand not found');
      }
  
      // Kiểm tra nếu product.type là 'barter' thì xóa các trường price và priceNew
      const updateFields: any = { 
        $set: {
          ...product, 
          'approved.approveStatus': 'pending',
          'approved.decisionBy': null,
          'approved.date': null,
          'approved.description': null,
        },
      };
  
      if (product.type === 'barter') {
        updateFields.$unset = { price: '', priceNew: '' };
      }
  
      // Kiểm tra xem productName có trùng với sản phẩm khác không
      if (product.productName) {
        const checkExist = await this.productModel.findOne({
          productName: product.productName,
        });
        if (checkExist && checkExist._id.toString() !== productId) {
          throw new BadRequestException('Product with this name already exists');
        }
      }
  
      // Cập nhật sản phẩm
      const updatedProduct = await this.productModel.findByIdAndUpdate(
        {
          _id: productId,
          userId,
        },
        updateFields,
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
        { new: true }, // Return the updated document
      );

      if (!productDelete) {
        throw new BadRequestException('Product not found or not owned by user');
      }

      await this.brandModel
        .findByIdAndUpdate(productDelete.brandId, {
          $inc: { totalProduct: -1 },
        })
        .exec();

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
    userId: string,
    page: number = 1,
    limit: number = 10,
    searchKey?: string,
    filterField?: string,
    filterValue?: string,
    sortField: string = 'createdAt',
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

      if (filterField && filterValue) {
        query[filterField] = filterValue;
      }

      const [data, total] = await Promise.all([
        this.productModel
          .find(query)
          .sort({ [sortField]: sortOrder })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean({ virtuals: true })
          .exec(),
        this.productModel.countDocuments(query),
      ]);

      return { data, total };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to get products');
    }
  }
  async listProductForClientService(
    page: number = 1,
    limit: number = 10,
    filterCategory?: string[],
    filterBrand?: string[],
    filterStartPrice?: number,
    filterEndPrice?: number,
    filterSize?: string[],
    filterColor?: string[],
    filterMaterial?: string[],
    filterCondition?: string[],
    filterType?: string[],
    filterStyle?: string[],
  ): Promise<{ data: any; total: number }> {
    try {
      const query: any = {
        status: 'active',
        isDeleted: false,
        'approved.approveStatus': 'approved',
        isBlock: false,
      };

      const addFilter = (field: string, value: any) => {
        if (value && value.length > 0) {
          query[field] = { $in: value };
        }
      };

      addFilter('categoryId', filterCategory);
      addFilter('brandId', filterBrand);
      addFilter('size', filterSize);
      addFilter('color', filterColor);
      addFilter('material', filterMaterial);
      addFilter('condition', filterCondition);
      addFilter('type', filterType);
      addFilter('style', filterStyle);

      if (filterStartPrice !== undefined || filterEndPrice !== undefined) {
        query.price = {};
        if (filterStartPrice !== undefined) {
          query.price.$gte = filterStartPrice;
        }
        if (filterEndPrice !== undefined) {
          query.price.$lte = filterEndPrice;
        }
      }

      const [products, total] = await Promise.all([
        this.productModel
          .find(query)
          .populate('categoryId', 'name')
          .populate('brandId', 'name')
          .populate('userId', 'firstname lastname')
          .select(
            '-createdAt -updatedAt -__v -sizeVariants -approved -isDeleted -isBlock',
          )
          .skip((page - 1) * limit)
          .limit(limit)
          .lean({ virtuals: true })
          .exec(),
        this.productModel.countDocuments(query),
      ]);

      return { data: products, total };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to get products');
    }
  }

  async getProductDetailService(productId: string): Promise<Product> {
    try {
      const product = await this.productModel
        .findById(productId)
        .select('-createdAt -updatedAt -__v  -approved -isDeleted -isBlock')
        .populate('categoryId', 'name')
        .populate('brandId', 'name')
        .populate('userId', 'firstname lastname')
        .lean({ virtuals: true })
        .exec();

      if (!product) {
        throw new BadRequestException('Product not found');
      }

      return product;
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to get product detail',
      );
    }
  }

    async getProductsByUserStyleService(userId: string): Promise<{ data: any }> {
    try {
      // Bước 1: Lấy thông tin người dùng
      const user = await this.userModel.findById(userId).exec();
  
      // Kiểm tra nếu người dùng không có phong cách hoặc không tồn tại
      if (!user || !user.userStyle) {
        throw new NotFoundException('User or user style not found');
      }
  
      const { color, material, size, hobby, age, zodiacSign, style } =
        user.userStyle;
  
      // Bước 2: Tìm các sản phẩm đang hoạt động và đã được phê duyệt
      const products = await this.productModel
        .find({
          status: 'active', // Chỉ lấy các sản phẩm đang hoạt động
          'approved.approveStatus': 'approved', // Chỉ lấy các sản phẩm đã được phê duyệt
          isDeleted: false, // Loại bỏ các sản phẩm đã bị xóa
          userId: { $ne: userId }, // Loại bỏ các sản phẩm của userId hiện tại
        })
        .select('-__v -createdAt -updatedAt') // Projection to exclude unnecessary fields
        .lean() // Return plain JavaScript objects
        .exec();
  
      // Bước 3: Tìm sản phẩm phù hợp nhất
      const matchedProducts = products.map((product) => {
        const sizeMatches = product.sizeVariants.some((variant) =>
          size.includes(variant.size),
        );
        const colorMatches = product.sizeVariants.some((variant) =>
          color.includes(variant.colors),
        );
        const materialMatches = material.includes(product.material);
        const styleMatches = style.includes(product.style);
        const tagMatches = [hobby, age, zodiacSign].some(
          (tag) => typeof tag === 'string' && product.tags.includes(tag),
        );
  
        // Calculate score based on matches
        let score = 0;
        if (styleMatches) score += 3;
        if (sizeMatches) score += 2;
        if (colorMatches) score += 2;
        if (materialMatches) score += 1;
        if (tagMatches) score += 1;
  
        return { ...product, score };
      });
      
      // Bước 4: Sắp xếp các sản phẩm theo điểm số từ cao đến thấp
      matchedProducts.sort((a, b) => b.score - a.score);
  
      // Bước 5: Lấy 10 sản phẩm có điểm cao nhất
      const top10Products = matchedProducts.slice(0, 10);
      
      // Bước 6: Trả về danh sách sản phẩm phù hợp
      return { data: top10Products };
    } catch (error) {
      throw new NotFoundException(
        error.message || 'Failed to get products by user style',
      );
    }
  }

  
  

  //*****************manage product***************** */
  async listProductForAdminService(
    page: number,
    limit: number,
    searchKey?: string,
    sortField: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'asc',
    filterField?: string, // Trường để lọc
    filterValue?: string, // Giá trị lọc
  ): Promise<{ total: number; products: any[] }> {
    try {
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
        .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 }) // Sắp xếp theo sortField và sortOrder
        .skip((page - 1) * limit)
        .limit(limit)
        .lean({ virtuals: true }) // Trả về plain objects thay vì Mongoose documents
        .exec();

      // Tái cấu trúc dữ liệu để loại bỏ các object lồng bên trong
      const structuredProducts = products.map((product) => ({
        _id: product._id,
        productName: product.productName,
        imgUrls: product.imgUrls,
        material: product.material,
        userId: product.userId ? (product.userId as any)._id : null,
        userName: product.userId
          ? `${(product.userId as any).firstname} ${(product.userId as any).lastname}`
          : null, // Ghép tên người dùng
        categoryName: product.categoryId
          ? (product.categoryId as any).name
          : null, // Lấy category name ra ngoài
        brandName: product.brandId ? (product.brandId as any).name : null, // Lấy brand name ra ngoài
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
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to get products');
    }
  }

  //approved product
  async approveProductService(
    productId: string,
    decisionBy: string,
    approveStatus: string,
    description?: string,
  ): Promise<{ message: string }> {
    try {
      if (!decisionBy) {
        throw new BadRequestException('Decision by is required');
      }
      await this.productModel
        .findByIdAndUpdate(productId, {
          $set: {
            'approved.approveStatus': approveStatus,
            'approved.decisionBy': decisionBy,
            'approved.date': Date.now(),
            'approved.description': description || null,
          },
        })
        .exec();
      return { message: 'Product approved successfully' };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to approve product',
      );
    }
  }

  async blockProductService(
    productId: string,
    isBlock: boolean,
  ): Promise<{ message: string }> {
    try {
      const productBlock = await this.productModel
        .findByIdAndUpdate(
          productId,
          {
            $set: {
              isBlock,
            },
          },
          { new: true }, // Return the updated document
        )
        .populate('userId', 'email')
        .exec();

      if (!productBlock) {
        throw new BadRequestException('Product not found');
      }

      const email = (productBlock.userId as any).email; // Get the user's email
      const productName = productBlock.productName; // Get the product name
      if ((isBlock = true)) {
        this.mailerService.sendEmailBlockedProduct(email, productName);
      }
      if ((isBlock = false)) {
        this.mailerService.sendEmailUnblockedProduct(email, productName);
      }
      return { message: 'Product blocked successfully' };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to block product');
    }
  }
}
