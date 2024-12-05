import { Test, TestingModule } from '@nestjs/testing';
import { PacketService } from './packet.service';

describe('PacketService', () => {
  let service: PacketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PacketService],
    }).compile();

    service = module.get<PacketService>(PacketService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
