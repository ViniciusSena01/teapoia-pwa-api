import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { diarioRoutes } from './diario.routes.js';
import { locaisRoutes } from './locais.routes.js';

export const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/diario', diarioRoutes);
routes.use('/locais', locaisRoutes);

