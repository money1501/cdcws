import { Controller, Get, Req, Res } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';

@Controller()
export class AppController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @AllowAnonymous()
  @Get()
  async getHealth(@Req() req: Request, @Res() res: Response) {
    await this.dataSource.query('SELECT 1');
    const acceptsHtml = req.headers.accept?.includes('text/html');
    if (acceptsHtml) {
      const target = process.env.FRONTEND_URL || 'https://boared.live';
      return res.redirect(target.startsWith('http') ? target : `https://${target}`);
    }
    return res.json({
      status: 'ok',
      database: this.dataSource.isInitialized ? 'connected' : 'disconnected',
    });
  }
}

