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
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SearchService } from 'src/search/search.service';

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
    @InjectQueue('send-email') private readonly sendEmailQueue: Queue,
    private readonly searchService: SearchService,
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
      await this.categoryModel.findByIdAndUpdate(
        product.categoryId, { $inc: { totalProduct: 1 } }
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
      // Fetch the existing product once to check current brand and category associations
      const existingProduct = await this.productModel.findById(productId);
      if (!existingProduct) {
        throw new BadRequestException('Product not found');
      }
  
      // Validate category and brand existence if IDs are provided and changed
      const [checkCategory, checkBrand] = await Promise.all([
        product.categoryId && product.categoryId !== existingProduct.categoryId?.toString()
          ? this.categoryModel.findById(product.categoryId)
          : null,
        product.brandId && product.brandId !== existingProduct.brandId?.toString()
          ? this.brandModel.findById(product.brandId)
          : null,
      ]);
  
      if (product.categoryId && !checkCategory) {
        throw new BadRequestException('Category not found');
      }
      if (product.brandId && !checkBrand) {
        throw new BadRequestException('Brand not found');
      }
  
      // Prepare fields to update
      const updateFields: any = {
        $set: {
          ...product,
          'approved.approveStatus': 'pending',
          'approved.decisionBy': null,
          'approved.date': null,
          'approved.description': null,
        },
      };
  
      // If product type is 'barter', remove price and priceNew
      if (product.type === 'barter') {
        updateFields.$unset = { price: '', priceNew: '' };
        delete updateFields.$set.price;
        delete updateFields.$set.priceNew;
      }
  
      // Check for existing product with the same name
      if (product.productName) {
        const checkExist = await this.productModel.findOne({
          productName: product.productName,
          _id: { $ne: productId },
        });
        if (checkExist) {
          throw new BadRequestException('Product with this name already exists');
        }
      }
  
      // Handle brand and category count adjustments if they have changed
      const updatePromises = [];
      if (product.brandId && product.brandId !== existingProduct.brandId?.toString()) {
        updatePromises.push(
          this.brandModel.findByIdAndUpdate(existingProduct.brandId, {
            $inc: { totalProduct: -1 },
          }),
          this.brandModel.findByIdAndUpdate(product.brandId, {
            $inc: { totalProduct: 1 },
          })
        );
      }
  
      if (product.categoryId && product.categoryId !== existingProduct.categoryId?.toString()) {
        updatePromises.push(
          this.categoryModel.findByIdAndUpdate(existingProduct.categoryId, {
            $inc: { totalProduct: -1 },
          }),
          this.categoryModel.findByIdAndUpdate(product.categoryId, {
            $inc: { totalProduct: 1 },
          })
        );
      }
  
      // Execute brand/category updates in parallel
      await Promise.all(updatePromises);
  
      // Update the product
      const updatedProduct = await this.productModel.findOneAndUpdate(
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
      // Mark the product as deleted
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
  
      // Adjust total product count for both brand and category if applicable
      const updatePromises = [];
      
      if (productDelete.brandId) {
        updatePromises.push(
          this.brandModel.findByIdAndUpdate(productDelete.brandId, {
            $inc: { totalProduct: -1 },
          })
        );
      }
  
      if (productDelete.categoryId) {
        updatePromises.push(
          this.categoryModel.findByIdAndUpdate(productDelete.categoryId, {
            $inc: { totalProduct: -1 },
          })
        );
      }
  
      // Execute brand and category updates in parallel
      await Promise.all(updatePromises);
  
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
    filterSize?: string | string[],
    filterColor?: string | string[],
    filterMaterial?: string[],
    filterTypeCategory?: string[], // New filter for category type
    filterCondition?: string[],
    filterType?: string[],
    filterStyle?: string[],
    searchKey?: string, // Search key added here
  ): Promise<{ data: any; total: number }> {
    try {
      const query: any = {
        status: 'active',
        isDeleted: false,
        'approved.approveStatus': 'approved',
        isBlock: false,
      };
  
      // If searchKey is provided, search using Elasticsearch and filter results accordingly
      if (searchKey) {
        const searchResults = await this.searchService.searchProductsService(searchKey);
        //query approveStatus = approved and isDeleted = false and isBlock = false and status = active
        
        // If filters are applied, we filter the search results further
        const filteredResults = searchResults.filter(product => {
          // Add filter conditions based on filters such as category, brand, etc.
          return (
            (!filterCategory || filterCategory.includes(product.categoryName)) &&
            (!filterBrand || filterBrand.includes(product.brandName)) &&
            (!filterStartPrice || product.price >= filterStartPrice) &&
            (!filterEndPrice || product.price <= filterEndPrice) &&
            (!filterCondition || filterCondition.includes(product.condition)) &&
            (!filterMaterial || filterMaterial.includes(product.material)) &&
            (!filterStyle || filterStyle.includes(product.style))
          );
        });
  
        const paginatedResults = filteredResults.slice((page - 1) * limit, page * limit);
  
        return {
          data: paginatedResults,
          total: filteredResults.length,
        };
      }
  
      // Function to add filter criteria
      const addFilter = (field: string, value: string | string[]) => {
        if (value) {
          const valuesArray = Array.isArray(value) ? value : [value];
          if (valuesArray.length > 0) {
            query[field] = { $in: valuesArray };
          }
        }
      };
  
      // Apply filters for fields
      addFilter('categoryId', filterCategory);
      addFilter('brandId', filterBrand);
      addFilter('material', filterMaterial);
      addFilter('condition', filterCondition);
      addFilter('type', filterType);
      addFilter('style', filterStyle);
  
      // Filter for typeCategory
      if (filterTypeCategory) {
        const typeCategoryArray = Array.isArray(filterTypeCategory) ? filterTypeCategory : [filterTypeCategory];
        const categoryIds = await this.categoryModel
          .find({ type: { $in: typeCategoryArray } })
          .distinct('_id');
  
        if (categoryIds.length > 0) {
          query.categoryId = { $in: categoryIds };
        } else {
          query.categoryId = null;
        }
      }
  
      // Filter for size
      if (filterSize) {
        const sizes = Array.isArray(filterSize) ? filterSize : [filterSize];
        query.sizeVariants = { $elemMatch: { size: { $in: sizes } } };
      }
  
      // Filter for color
      if (filterColor) {
        const colors = Array.isArray(filterColor) ? filterColor : [filterColor];
        query.sizeVariants = {
          ...query.sizeVariants,
          $elemMatch: { colors: { $in: colors } },
        };
      }
  
      // Price range filter
      if (filterStartPrice !== undefined || filterEndPrice !== undefined) {
        query.price = {};
        if (filterStartPrice !== undefined) {
          query.price.$gte = filterStartPrice;
        }
        if (filterEndPrice !== undefined) {
          query.price.$lte = filterEndPrice;
        }
      }
  
      // Fetch data and count total
      const [products, total] = await Promise.all([
        this.productModel
          .find(query)
          .populate('categoryId', 'name type')
          .populate('brandId', 'name')
          .populate('userId', 'firstname lastname avatar')
          .select('-createdAt -updatedAt -__v -approved -isDeleted -isBlock')
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
        .populate('categoryId', 'name type')
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

  async getProductBySlugService(slug: string): Promise<Product> {
    try {
      const product = await this.productModel
        .findOne({ slug })
        .select('-createdAt -updatedAt -__v  -approved -isDeleted -isBlock')
        .populate('categoryId', 'name type')
        .populate('brandId', 'name')
        .populate('userId', 'firstname lastname avatar')
        .lean({ virtuals: true })
        .exec();

      if (!product) {
        throw new BadRequestException('Product not found');
      }

      return product;
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to get product by slug',
      );
    }
  }

  async getProductsByUserStyleService(userId: string): Promise<{ data: any }> {
    try {
      // Step 1: Retrieve user information
      const user = await this.userModel.findById(userId).exec();
  
      if (!user || !user.userStyle) {
        throw new NotFoundException('User or user style not found');
      }
  
      const { color, material, size, hobby, age, zodiacSign, style, gender } =
        user.userStyle;
  
      // Step 2: Fetch products and populate the category to access its type
      const products = await this.productModel
        .find({
          status: 'active', // Only active products
          'approved.approveStatus': 'approved', // Only approved products
          isDeleted: false, // Exclude deleted products
          userId: { $ne: userId }, // Exclude the current user's products
        })
        .populate('categoryId', 'type') // Populate categoryId to access type field
        .select('-__v -createdAt -updatedAt') // Exclude unnecessary fields
        .lean() // Return plain JavaScript objects
        .exec();
  
      // Step 3: Filter products based on gender or unisex
      const filteredProducts = products.filter(
        (product) =>
          (product.categoryId as any).type === gender || (product.categoryId as any).type === 'unisex',
      );
  
      // Step 4: Calculate matching score for each product
      const matchedProducts = filteredProducts.map((product) => {
        const sizeMatches = product.sizeVariants?.some((variant) =>
          size?.includes(variant.size),
        );
        const colorMatches = product.sizeVariants?.some((variant) =>
          color?.includes(variant.colors),
        );
        const materialMatches = material?.includes(product.material);
        const styleMatches = style?.includes(product.style);
        const tagMatches = [hobby, age, zodiacSign].some(
          (tag) => typeof tag === 'string' && product.tags?.includes(tag),
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
  
      // Step 5: Sort by score in descending order
      matchedProducts.sort((a, b) => b.score - a.score);
  
      // Step 6: Select the top 10 products
      const top10Products = matchedProducts.slice(0, 10);
  
      // Step 7: Return the list of top matched products
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
    sortField: string = 'createdAt', // Mặc định là 'createdAt'
    sortOrder: 'asc' | 'desc' = 'desc', // Mặc định là 'desc'
    filterField?: string,
    filterValue?: string,
  ): Promise<{ total: number; products: any[] }> {
    try {
      // Tạo query tìm kiếm theo tên sản phẩm
      const query: any = {
        productName: { $regex: searchKey || '', $options: 'i' },
      };
  
      // Áp dụng filterField và filterValue nếu có
      if (filterField && filterValue) {
        query[filterField] = filterValue;
      }
  
      // Đếm tổng số sản phẩm phù hợp với query
      const total = await this.productModel.countDocuments(query).exec();
  
      // Truy vấn danh sách sản phẩm dựa trên query, sắp xếp và phân trang
      const products = await this.productModel
        .find(query)
        .populate('categoryId', 'name type')
        .populate('brandId', 'name')
        .populate('userId', 'firstname lastname')
        // Sắp xếp theo sortField và sortOrder, mặc định là createdAt giảm dần
        .sort({ [sortField]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean({ virtuals: true }) // Trả về plain objects thay vì Mongoose documents
        .exec();
  
      // Tái cấu trúc dữ liệu
      const structuredProducts = products.map((product) => ({
        _id: product._id,
        productName: product.productName,
        imgUrls: product.imgUrls,
        material: product.material,
        userId: product.userId ? (product.userId as any)._id : null,
        userName: product.userId
          ? `${(product.userId as any).firstname} ${(product.userId as any).lastname}`
          : null,
        categoryName: product.categoryId ? (product.categoryId as any).name : null,
        brandName: product.brandId ? (product.brandId as any).name : null,
        approved: product.approved,
        isDeleted: product.isDeleted,
        status: product.status,
        isBlock: product.isBlock,
        type: product.type,
        price: product.price,
        priceNew: product.priceNew,
        tags: product.tags,
        createdAt: (product as any).createdAt,
        updatedAt: (product as any).updatedAt,
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
  
      const product = await this.productModel.findByIdAndUpdate(
        productId,
        {
          $set: {
            'approved.approveStatus': approveStatus,
            'approved.decisionBy': decisionBy,
            'approved.date': Date.now(),
            'approved.description': description || null,
          },
        },
        { new: true } // Trả về sản phẩm sau khi đã cập nhật
      ).exec();
  
      if (!product) {
        throw new NotFoundException('Product not found');
      }
  
      const user = await this.userModel.findById(product.userId).select('email').lean().exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      const email = user.email; // Lấy email của người dùng
      const productName = product.productName; // Lấy tên sản phẩm  
      await this.sendEmailQueue.add(
        'send-email-notification',
        {
          email,
          productName,
          approveStatus,
        },
        {
          removeOnComplete: true,
        }
      );
  
      return { message: 'Product approved successfully' };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to approve product');
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