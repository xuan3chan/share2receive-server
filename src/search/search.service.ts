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

  // Transforms a product from MongoDB into the desired format
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
      approveStatus: product.approved.approveStatus,
      userId: {
        _id: product.userId?._id.toString(),
        firstname: product.userId?.firstname,
        lastname: product.userId?.lastname,
        avatar: product.userId?.avatar,
      },
      categoryId: {
        _id: product.categoryId?._id.toString(),
        name: product.categoryId?.name,
        type: product.categoryId?.type,
      },
      brandId: {
        _id: product.brandId?._id.toString(),
        name: product.brandId?.name,
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

  // Runs when the module initializes
  async onModuleInit() {
    await this.syncWithElasticsearch(); // Sync new changes
    await this.reindexAllProducts();    // Reindex all existing products
  }

  // Syncs new changes to Elasticsearch
  async syncWithElasticsearch() {
    const changeStream = this.productModel.watch(); // Watches for events on Product collection

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
            await this.elasticsearchService.update({
              index: 'products',
              id: documentKey._id.toString(),
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
        this.logger.error(`Error syncing document ${documentKey._id} with Elasticsearch`, error);
      }
    });
  }

  // Reindexes all existing products
  async reindexAllProducts() {
    try {
      const fullDocuments = await this.productModel
        .find({})
        .populate('categoryId', 'name type')
        .populate('brandId', 'name')
        .populate('userId', 'firstname lastname avatar')
        .lean();

      for (const product of fullDocuments) {
        const productSearchCriteria = this.transformProduct(product);

        await this.elasticsearchService.index({
          index: 'products',
          body: productSearchCriteria,
          id: product._id.toString(),
        });
        this.logger.log(`Product reindexed: ${product._id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to reindex products: ${error.message}`);
    }
  }

  // Search method for products
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
                    fuzziness: '1',
                    operator: 'or',
                    minimum_should_match: '1<85%',
                  },
                },
                {
                  match: {
                    productName: {
                      query: searchKey,
                      boost: 5,
                    },
                  },
                },
              ],
            },
          },
        },
      });

      // Filter products with specific conditions
      const products = body.hits.hits
        .map((hit) => hit._source)
        .filter((product) => product.approveStatus === 'approved' && !product.isDeleted && !product.isBlocked && product.status === 'active');
      return products;
    } catch (error) {
      this.logger.error(`Error searching products: ${error.message}`);
      throw new NotFoundException('Failed to search products');
    }
  }
}
