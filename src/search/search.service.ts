import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductDocument } from '@app/libs/common/schema'; // Đường dẫn schema Product

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

  // Phương thức để lắng nghe Change Streams từ MongoDB
  async syncWithElasticsearch() {
    const changeStream = this.productModel.watch(); // Lắng nghe các sự kiện trên Product collection

    changeStream.on('change', async (change) => {
      const { operationType, documentKey, fullDocument } = change;

      try {
        if (operationType === 'insert') {
          // Thêm document vào Elasticsearch khi có thêm mới trong MongoDB
          await this.elasticsearchService.index({
            index: 'products',
            id: documentKey._id.toString(),
            body: fullDocument,
          });
          this.logger.log(`Product indexed: ${documentKey._id}`);
        } else if (operationType === 'update') {
          // Cập nhật document trong Elasticsearch khi MongoDB có sự thay đổi
          await this.elasticsearchService.update({
            index: 'products',
            id: documentKey._id.toString(),
            body: {
              doc: fullDocument,
            },
          });
          this.logger.log(`Product updated: ${documentKey._id}`);
        } else if (operationType === 'delete') {
          // Xóa document trong Elasticsearch khi document bị xóa trong MongoDB
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
}
