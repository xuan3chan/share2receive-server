import { Controller } from '@nestjs/common';
import { ConfigsService } from './configs.service';

@Controller('configs')
export class ConfigsController {
  constructor(private readonly configsService: ConfigsService) {}
}
