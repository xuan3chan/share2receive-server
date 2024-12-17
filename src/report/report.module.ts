import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportSchema,Report, SubOrder, SubOrderSchema, Product, ProductSchema, User, UserSchema, ReportHistory, ReportHistorySchema, Configs, ConfigsSchema } from '@app/libs/common/schema';
import { AdminModule } from 'src/admin/admin.module';
import { AbilityFactory } from '@app/libs/common/abilities';
import { GatewayModule } from '@app/libs/common/util/gateway.module';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [
    AdminModule,
    GatewayModule,
    MailerModule,
    
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      {name:SubOrder.name,schema:SubOrderSchema},
      {name:Product.name,schema:ProductSchema},
      {name:User.name,schema:UserSchema},
      {name:ReportHistory.name,schema:ReportHistorySchema},
      {name:Configs.name, schema: ConfigsSchema},
  ]),],
  controllers: [ReportController],
  providers: [ReportService,AbilityFactory],
})
export class ReportModule {}
