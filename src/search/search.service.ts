import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
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
  async searchProductsService(criteria: ProductSearchCriteria) {
    const mustQueries = [];
  
    // Sử dụng multi_match để tìm kiếm trên nhiều trường, không phân biệt hoa thường và khoảng cách
    if (criteria.productName) {
      mustQueries.push({
        multi_match: {
          query: criteria.productName,
          fields: [
            'productName^3', // Trọng số cao hơn cho productName
            'categoryName^2', // Trọng số trung bình cho categoryName
            'brandName', // Trọng số thấp hơn cho brandName
          ],
          fuzziness: 'AUTO', // Tìm kiếm với fuzzy để hỗ trợ lỗi chính tả
          operator: 'and',
          minimum_should_match: '75%',
        },
      });
    }
  
    // Tìm kiếm các trường khác
    if (criteria.type) {
      mustQueries.push({
        match: { type: { query: criteria.type, operator: 'and' } },
      });
    }
  
    if (criteria.price) {
      mustQueries.push({
        range: {
          price: 
            { gte: criteria.price }
        },
      });
    }
  
    if (criteria.condition) {
      mustQueries.push({
        match: { condition: { query: criteria.condition, operator: 'and' } },
      });
    }
  
    if (criteria.tags) {
      mustQueries.push({
        terms: { tags: criteria.tags },
      });
    }
  
    if (criteria.material) {
      mustQueries.push({
        match: { material: { query: criteria.material, operator: 'and' } },
      });
    }
  
    if (criteria.style) {
      mustQueries.push({
        match: { style: { query: criteria.style, operator: 'and' } },
      });
    }
  
    if (criteria.sizeVariants) {
      mustQueries.push({
        nested: {
          path: 'sizeVariants',
          query: {
            bool: {
              must: Array.isArray(criteria.sizeVariants) ? criteria.sizeVariants.map((variant) => ({
                match: { 'sizeVariants.size': { query: variant.size, operator: 'and' } },
              })) : [],
            },
          },
        },
      });
    }
  
    // Tạo truy vấn tìm kiếm
    const { body } = await this.elasticsearchService.search({
      index: 'products',
      body: {
        query: {
          bool: {
            must: mustQueries,
          },
        },
      },
    });
  
    return body.hits.hits.map((hit) => hit._source);
  }
}