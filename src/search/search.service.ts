import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductDocument } from '@app/libs/common/schema'; // Đường dẫn schema Product
import {ProductSearchCriteria} from '@app/libs/common/interface'



@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectModel('Product') private productModel: Model<ProductDocument>,
  ) {}

  // Khởi động khi module bắt đầu
  async onModuleInit() {
    this.syncWithElasticsearch();
  }


  async syncWithElasticsearch() {
    const changeStream = this.productModel.watch(); // Lắng nghe các sự kiện trên Product collection
  
    changeStream.on('change', async (change) => {
      const { operationType, documentKey } = change;
  
      try {
        if (operationType === 'insert' || operationType === 'update') {
          // Lấy đầy đủ document từ MongoDB với populate
          const fullDocument = await this.productModel
            .findById(documentKey._id)
            .populate('categoryId', 'name') // Populate trường categoryId chỉ lấy name
            .populate('brandId', 'name'); // Populate trường brandId chỉ lấy name
  
          const { _id, ...body } = fullDocument.toObject(); // Xóa _id khỏi body
  
          // Map MongoDB document fields to ProductSearchCriteria fields
          const productSearchCriteria: ProductSearchCriteria = {
            productName: body.productName,
            categoryName: (body.categoryId as any).name, // Lấy tên của category
            brandName: (body.brandId as any)?.name, // Lấy tên của brand
            type: body.type === 'sale' || body.type === 'barter' ? body.type : undefined,
            price: body.price,
            condition: body.condition === 'new' || body.condition === 'used' ? body.condition : undefined,
            tags: body.tags,
            material: body.material,
            sizeVariants: body.sizeVariants?.map((variant: any) => ({
              size: variant.size as string,
              colors: variant.colors as string,
              amount: variant.amount as number,
            })) as ProductSearchCriteria['sizeVariants'],
            style: body.style,
            description: body.description,
          };
  
          if (operationType === 'insert') {
            await this.elasticsearchService.index({
              index: 'products',
              body: productSearchCriteria, // Truyền phần còn lại của document
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
  async searchProductsService(searchKey: string) {
    try {
      const { body } = await this.elasticsearchService.search({
        index: 'products',
        body: {
          query: {
            multi_match: {
              query: searchKey,
              fields: [
                'productName^3',
                'categoryName^2',
                'brandName',
                'tags',
                'description',
              ],
              fuzziness: '1', // Tăng độ fuzziness
              operator: 'or',
              minimum_should_match: '1<75%', // Tối thiểu 75% từ trong truy vấn
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