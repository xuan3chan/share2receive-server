import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductDocument } from '@app/libs/common/schema';

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
      isBlock: product.isBlock,
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
    await this.createIndexWithSynonyms();
    await this.syncWithElasticsearch();
    await this.reindexAllProducts();
  }

  async createIndexWithSynonyms() {
    const indexName = process.env.ELASTICSEARCH_INDEX_NAME;
    try {
      const indexExists = await this.elasticsearchService.indices.exists({ index: indexName });
      if (indexExists) {
        this.logger.log(`Index "${indexName}" already exists. Deleting...`);
        await this.elasticsearchService.indices.delete({ index: indexName });
      }

      await this.elasticsearchService.indices.create({
        index: indexName,
        body: {
          settings: {
            analysis: {
              analyzer: {
                synonym_analyzer: {
                  tokenizer: 'standard',
                  filter: ['lowercase', 'synonym_filter'],
                },
              },
              filter: {
                synonym_filter: {
                  type: 'synonym',
                  synonyms: [
                    // T-shirts and related
                    'áo thun, tshirt, tee, áo phông, áo ngắn tay, áo ba lỗ, tank top',
                    
                    // Outerwear
                    'áo khoác, jacket, áo chống gió, áo blazer, áo vest, áo cardigan, áo gió, windbreaker, trench coat, áo măng tô, coat',
                    'áo khoác bomber, bomber jacket, áo bomber, áo khoác ngắn, áo khoác nam nữ',
                    'áo hoodie, hoodie, áo nỉ có mũ, áo chui đầu, áo hoodie oversize, hoodie form rộng',
                    
                    // Shirts and blouses
                    'áo sơ mi, sơ mi, shirt, blouse, áo công sở, áo sơ mi cổ tàu, áo sơ mi ngắn tay',
                    
                    // Sweaters and pullovers
                    'áo len, sweater, áo chui đầu, áo ấm, áo len cổ lọ, áo len mỏng, áo len dệt kim',
                    
                    // Pants and shorts
                    'quần jeans, quần bò, denim, quần denim, quần boyfriend jeans, quần skinny, quần jeans nữ',
                    'quần short, quần ngắn, quần đùi, shorts, quần short jean, quần short thể thao',
                    'quần tây, trousers, dress pants, quần âu, quần dài',
                    'quần legging, legging, quần bó, quần tập gym, quần yoga, quần ôm sát',
                    'quần baggy, baggy pants, quần lửng, quần rộng',
                    'quần jogger, jogger pants, quần thể thao, quần jogger thể thao',
                    
                    // Dresses and skirts
                    'đầm, váy, dress, váy dạ hội, váy cưới, váy maxi, váy công sở, váy ngắn',
                    'váy midi, midi skirt, váy dài qua gối, váy công sở, váy bút chì',
                    
                    // Traditional and formal wear
                    'áo dài, áo truyền thống, áo cưới, áo dài cách tân, áo dài Việt Nam',
                    
                    // Footwear
                    'giày cao gót, giày nữ, giày gót nhọn, high heels, giày pump, sandal gót cao',
                    'giày thể thao, sneakers, giày, giày chạy bộ, giày tập gym, giày sneaker, giày sneaker nữ, giày tập thể thao',
                    'giày lười, loafers, slip-on, giày không dây, giày mọi',
                    'bốt, boots, giày cổ cao, giày da, giày mùa đông, giày cổ lửng',
                    'sandal, dép quai hậu, dép xỏ ngón, dép, sandals, giày sandal, dép kẹp',
                    
                    // Accessories
                    'mũ, nón, hat, cap, mũ lưỡi trai, mũ bảo hiểm, mũ rộng vành, mũ bucket',
                    'khăn choàng, scarf, muffler, khăn quàng cổ, khăn len, khăn mỏng, khăn mùa đông',
                    'dây nịt, dây lưng, thắt lưng, belt, dây thắt eo, dây lưng nữ, thắt lưng da',
                    'kính râm, kính mắt, sunglasses, glasses, kính thời trang, kính cận, kính mắt mèo',
                    'găng tay, gloves, bao tay, găng len, găng tay da, găng tay lụa',
                    
                    // Nightwear and sportswear
                    'đồ ngủ, pajamas, pyjamas, đồ mặc nhà, đồ ngủ cotton, bộ đồ ngủ',
                    'đồ thể thao, sportwear, activewear, quần áo gym, đồ tập thể dục, đồ thể thao nữ',
                    
                    // Swimwear
                    'đồ bơi, swimsuit, đồ tắm, bikini, quần bơi, đồ bơi liền mảnh',
                    
                    // Socks and stockings
                    'tất, vớ, socks, tất ngắn, tất dài, vớ thể thao, vớ lưới',
                    
                    // Formal and casual accessories
                    'túi xách, handbag, túi, balo, túi đeo chéo, túi đựng đồ, backpack, túi tote',
                    'túi clutch, clutch, túi cầm tay, ví cầm tay, túi dự tiệc',
                  ]
                  
                },
              },
            },
          },
          mappings: {
            properties: {
              productName: {
                type: 'text',
                analyzer: 'synonym_analyzer',
                fields: {
                  keyword: { type: 'keyword', ignore_above: 256 },
                },
              },
              description: { type: 'text', analyzer: 'synonym_analyzer' },
              tags: { type: 'text', analyzer: 'synonym_analyzer' },
              categoryId: {
                properties: {
                  name: { type: 'text', analyzer: 'synonym_analyzer' },
                },
              },
              brandId: {
                properties: {
                  name: { type: 'text', analyzer: 'synonym_analyzer' },
                },
              },
              sizeVariants: {
                type: 'nested',
                properties: {
                  size: { type: 'keyword' },
                  colors: { type: 'keyword' },
                  amount: { type: 'integer' },
                },
              },
            },
          },
        },
      });

      this.logger.log(`Index "${indexName}" created with synonym and nested support.`);
    } catch (error) {
      this.logger.error(`Failed to create index "${indexName}": ${error.message}`);
    }
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
              index: process.env.ELASTICSEARCH_INDEX_NAME,
              body: productSearchCriteria,
              id: documentKey._id.toString(),
            });
          } else if (operationType === 'update') {
            await this.elasticsearchService.update({
              index: process.env.ELASTICSEARCH_INDEX_NAME,
              id: documentKey._id.toString(),
              retry_on_conflict: 3,
              body: {
                doc: productSearchCriteria,
              },
            });
          }
        } else if (operationType === 'delete') {
          await this.elasticsearchService.delete({
            index: process.env.ELASTICSEARCH_INDEX_NAME,
            id: documentKey._id.toString(),
          });
        }
      } catch (error) {
        this.logger.error(
          `Error syncing document ${documentKey._id} with Elasticsearch`,
          error,
        );
      }
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
          { index: { _index: process.env.ELASTICSEARCH_INDEX_NAME, _id: product._id.toString() } },
          productSearchCriteria,
        ];
      }).flat();

      if (bulkOperations.length > 0) {
        await this.elasticsearchService.bulk({ body: bulkOperations });
      }
    } catch (error) {
      this.logger.error(`Failed to reindex products: ${error.message}`);
    }
  }

  async searchProductsService(searchKey: string) {
    try {
      const { body } = await this.elasticsearchService.search({
        index: process.env.ELASTICSEARCH_INDEX_NAME,
        body: {
          query: {
            bool: {
              should: [
                {
                  match: {
                    productName: {
                      query: searchKey,
                      boost: 10,
                    },
                  },
                },
                {
                  multi_match: {
                    query: searchKey,
                    fields: [
                      'productName^5',
                      'categoryId.name^2',
                      'brandId.name^2',
                      'tags^1',
                    ],
                    fuzziness: 'AUTO',
                  },
                },
              ],
              minimum_should_match: 1,
              filter: [
                { term: { approveStatus: 'approved' } },
                { term: { isDeleted: false } },
                { term: { isBlock: false } },
                { term: { status: 'active' } },
                {
                  nested: {
                    path: 'sizeVariants',
                    query: {
                      range: {
                        'sizeVariants.amount': { gt: 0 },
                      },
                    },
                  },
                },
              ],
            },
          },
          sort: [
            { _score: 'desc' },
            { 'productName.keyword': 'asc' },
          ],
        },
      });

      return body.hits.hits.map((hit) => hit._source);
    } catch (error) {
      this.logger.error(`Error searching products: ${error.message}`);
      throw new NotFoundException('Failed to search products');
    }
  }
}
