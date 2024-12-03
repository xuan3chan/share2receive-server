import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import * as fs from 'fs';

export class StaticFileMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.url.startsWith('/files/')) {
      const filePath = join(__dirname, '..', 'uploads', req.url.replace('/files/', ''));
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Disposition', 'inline'); // Cho phép xem trước
        res.setHeader('Content-Type', 'application/octet-stream');
      }
    }
    next();
  }
}
