import { Router, Request, Response } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'TEApoia API',
    version: '1.0.0',
    description: 'API de Apoio e Autorregulação Sensorial (TEA)'
  });
});

