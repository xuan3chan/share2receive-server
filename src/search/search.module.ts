// src/elasticsearch/elasticsearch.module.ts
import { Module } from '@nestjs/common';
import { ElasticsearchModule as NestElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SearchService } from './search.service'; // Import SearchService
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema } from '@app/libs/common/schema';
import { SearchController } from './search.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Product', schema: ProductSchema }]),
    NestElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const node = configService.get<string>('ELASTICSEARCH_NODE');
        const username = configService.get<string>('ELASTICSEARCH_USERNAME');
        const password = configService.get<string>('ELASTICSEARCH_PASSWORD');

        if (!node || !username || !password) {
          throw new Error('Elasticsearch configuration is missing in environment variables');
        }

        return {
          node,
          auth: { username, password },
        };
      },
    }),
  ],
  controllers: [
    SearchController,
  ],
  providers: [SearchService], // Provide SearchService
  exports: [NestElasticsearchModule, SearchService], // Export SearchService
})
export class SearchModule {}