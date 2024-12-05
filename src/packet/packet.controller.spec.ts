import { Test, TestingModule } from '@nestjs/testing';
import { PacketController } from './packet.controller';
import { PacketService } from './packet.service';

describe('PacketController', () => {
  let controller: PacketController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PacketController],
      providers: [PacketService],
    }).compile();

    controller = module.get<PacketController>(PacketController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
