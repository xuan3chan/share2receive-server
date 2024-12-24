import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductDocument } from '@app/libs/common/schema';
import { ProductSearchCriteria } from '@app/libs/common/interface';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectModel('Product') private productModel: Model<ProductDocument>,
  ) {}

  private transformProduct(product: any) {
    return {
      productName: product.productName,
      imgUrls: product.imgUrls,
      sizeVariants: product.sizeVariants.map((variant: any) => ({
        size: variant.size,
        colors: variant.colors,
        amount: variant.amount,
        _id: variant._id.toString(),
      })),
      material: product.material,
      approveStatus: product.approved?.approveStatus,
      userId: {
        _id: product.userId?._id?.toString() || null,
        firstname: product.userId?.firstname || null,
        lastname: product.userId?.lastname || null,
        avatar: product.userId?.avatar || null,
      },
      categoryId: {
        _id: product.categoryId?._id?.toString() || null,
        name: product.categoryId?.name || null,
        type: product.categoryId?.type || null,
      },
      brandId: {
        _id: product.brandId?._id?.toString() || null,
        name: product.brandId?.name || null,
      },
      status: product.status,
      isDeleted: product.isDeleted,
      isBlocked: product.isBlocked,
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

  async onModuleInit() {
    await this.syncWithElasticsearch();
    await this.reindexAllProducts();
  }

  async syncWithElasticsearch() {
    const changeStream = this.productModel.watch();

    changeStream.on('change', async (change) => {
      const { operationType, documentKey } = change;

      try {
        if (operationType === 'insert' || operationType === 'update') {
          const fullDocument = await this.productModel
            .findById(documentKey._id)
            .populate('categoryId', 'name type')
            .populate('brandId', 'name')
            .populate('userId', 'firstname lastname avatar')
            .lean();

          const productSearchCriteria = this.transformProduct(fullDocument);

          if (operationType === 'insert') {
            await this.elasticsearchService.index({
              index: 'products',
              body: productSearchCriteria,
              id: documentKey._id.toString(),
            });
            this.logger.log(`Product indexed: ${documentKey._id}`);
          } else if (operationType === 'update') {
            // Handle version conflict with retry_on_conflict
            await this.elasticsearchService.update({
              index: 'products',
              id: documentKey._id.toString(),
              retry_on_conflict: 3, // Retry if version conflict occurs
              body: {
                doc: productSearchCriteria,
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
        if (
          error.status === 409 &&
          error.body?.error?.type === 'version_conflict_engine_exception'
        ) {
          this.logger.warn(
            `Version conflict detected for document: ${documentKey._id}. Skipping this operation.`,
          );
        } else {
          this.logger.error(
            `Error syncing document ${documentKey._id} with Elasticsearch`,
            error,
          );
        }
      }
    });

    changeStream.on('error', (err) => {
      this.logger.error('Change stream error:', err);
    });

    changeStream.on('close', () => {
      this.logger.warn('Change stream closed. Restarting...');
      this.syncWithElasticsearch();
    });
  }

  async reindexAllProducts() {
    try {
      const fullDocuments = await this.productModel
        .find({})
        .populate('categoryId', 'name type')
        .populate('brandId', 'name')
        .populate('userId', 'firstname lastname avatar')
        .lean();

      const bulkOperations = fullDocuments.map((product) => {
        const productSearchCriteria = this.transformProduct(product);
        return [
          { index: { _index: 'products', _id: product._id.toString() } },
          productSearchCriteria,
        ];
      }).flat();

      if (bulkOperations.length > 0) {
        await this.elasticsearchService.bulk({ body: bulkOperations });
        this.logger.log(`Successfully reindexed ${fullDocuments.length} products`);
      }
    } catch (error) {
      this.logger.error(`Failed to reindex products: ${error.message}`);
    }
  }

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
                      'categoryId.name^2',
                      'brandId.name',
                      'tags',
                      'description',
                    ],
                    fuzziness: 'AUTO',
                  },
                },
              ],
            },
          },
        },
      });
  
      const products = body.hits.hits
        .map((hit) => hit._source)
        .filter(
          (product) =>
            product.approveStatus === 'approved' &&
            !product.isDeleted &&
            !product.isBlocked &&
            product.status === 'active' &&
            product.sizeVariants &&
            product.sizeVariants.some((variant) => variant.amount > 0),
        );
  
      return products;
    } catch (error) {
      this.logger.error(`Error searching products: ${error.message}`);
      throw new NotFoundException('Failed to search products');
    }
  }
  
}
