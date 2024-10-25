import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductDocument } from '@app/libs/common/schema'; // Adjust the path accordingly
import { ProductSearchCriteria } from '@app/libs/common/interface';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectModel('Product') private productModel: Model<ProductDocument>,
  ) {}

  // Chuyển đổi một sản phẩm từ MongoDB sang định dạng mong muốn
  private transformProduct(product: any) {
    return {
      productName: product.productName,
      imgUrls: product.imgUrls,
      sizeVariants: product.sizeVariants.map((variant: any) => ({
        size: variant.size,
        colors: variant.colors,
        amount: variant.amount,
        _id: variant._id.toString(), // Nếu bạn cần lưu _id cho sizeVariants
      })),
      material: product.material,
      userId: {
        _id: product.userId?._id.toString(), // Kiểm tra xem userId có tồn tại không
        firstname: product.userId?.firstname,
        lastname: product.userId?.lastname,
        avatar: product.userId?.avatar,
      },
      categoryId: {
        _id: product.categoryId?._id.toString(), // Kiểm tra xem categoryId có tồn tại không
        name: product.categoryId?.name,
        type: product.categoryId?.type,
      },
      brandId: {
        _id: product.brandId?._id.toString(), // Kiểm tra xem brandId có tồn tại không
        name: product.brandId?.name,
      },
      status: product.status,
      type: product.type,
      price: product.price,
      priceNew: product.priceNew,
      tags: product.tags,
      condition: product.condition,
      style: product.style,
      description: product.description,
      weight: product.weight,
      slug: product.slug,
    };
  }

  // Khởi động khi module bắt đầu
  async onModuleInit() {
    await this.syncWithElasticsearch(); // Sync new changes
    await this.reindexAllProducts();    // Reindex all existing products
  }

  // Sync new changes to Elasticsearch
  // Cập nhật phương thức đồng bộ
async syncWithElasticsearch() {
  const changeStream = this.productModel.watch(); // Lắng nghe các sự kiện trên Product collection

  changeStream.on('change', async (change) => {
    const { operationType, documentKey } = change;

    try {
      if (operationType === 'insert' || operationType === 'update') {
        // Lấy đầy đủ document từ MongoDB với populate
        const fullDocument = await this.productModel
          .findById(documentKey._id)
          .populate('categoryId', 'name type') // Populate trường categoryId chỉ lấy name và type
          .populate('brandId', 'name') // Populate trường brandId chỉ lấy name
          .populate('userId', 'firstname lastname avatar') // Populate userId để lấy thông tin người dùng
          .lean(); // Chuyển đổi thành object thông thường để tối ưu hóa

        // Định dạng sản phẩm
        const productSearchCriteria = this.transformProduct(fullDocument);

        if (operationType === 'insert') {
          await this.elasticsearchService.index({
            index: 'products',
            body: productSearchCriteria,
            id: documentKey._id.toString(),
          });
          this.logger.log(`Product indexed: ${documentKey._id}`);
        } else if (operationType === 'update') {
          await this.elasticsearchService.update({
            index: 'products',
            id: documentKey._id.toString(),
            body: {
              doc: productSearchCriteria, // Cập nhật document mà không có _id trong body
            },
          });
          this.logger.log(`Product updated: ${documentKey._id}`);
        }
      } else if (operationType === 'delete') {
        await this.elasticsearchService.delete({
          index: 'products',
          id: documentKey._id.toString(),
        });
        this.logger.log(`Product deleted from Elasticsearch: ${documentKey._id}`);
      }
    } catch (error) {
      this.logger.error(`Error syncing document ${documentKey._id} with Elasticsearch`, error);
    }
  });
}


  // Method to reindex all existing products
  async reindexAllProducts() {
    try {
      const fullDocuments = await this.productModel
        .find({})
        .populate('categoryId', 'name type') // Populate thêm type nếu cần
        .populate('brandId', 'name') // Chỉ lấy name cho brandId
        .populate('userId', 'firstname lastname avatar') // Populate thêm thông tin người dùng
        .lean(); // Chuyển đổi thành object thông thường
  
      for (const product of fullDocuments) {
        // Gọi transformProduct với tất cả thông tin cần thiết
        const productSearchCriteria = this.transformProduct(product);
  
        // Index each product, setting _id as a parameter
        await this.elasticsearchService.index({
          index: 'products',
          body: productSearchCriteria, // Không có _id trong body
          id: product._id.toString(), // Sử dụng _id để lập chỉ mục
        });
        this.logger.log(`Product reindexed: ${product._id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to reindex products: ${error.message}`);
    }
  }

  // Search method
  async searchProductsService(searchKey: string) {
    try {
      const { body } = await this.elasticsearchService.search({
        index: 'products',
        body: {
          query: {
            bool: {
              should: [
                {
                  multi_match: {
                    query: searchKey,
                    fields: [
                      'productName^3',
                      'categoryName^2',
                      'brandName',
                      'tags',
                      'description',
                    ],
                    fuzziness: '1', // Increase fuzziness
                    operator: 'or',
                    minimum_should_match: '1<75%', // Minimum 75% match
                  },
                },
                {
                  match: {
                    productName: {
                      query: searchKey,
                      boost: 5, // Higher boost for productName
                    },
                  },
                },
              ],
            },
          },
        },
      });

      return body.hits.hits.map((hit) => hit._source);
    } catch (error) {
      this.logger.error(`Error searching products: ${error.message}`);
      throw new NotFoundException('Failed to search products');
    }
  }
}
