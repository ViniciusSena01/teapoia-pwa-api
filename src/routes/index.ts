import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { diarioRoutes } from './diario.routes.js';
import { contatosRoutes } from './contatos.routes.js';
import { criseRoutes } from './crise.routes.js';
import { locaisRoutes } from './locais.routes.js';
import { lgpdRoutes } from './lgpd.routes.js';

export const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/auth', authRoutes);
routes.use('/diario', diarioRoutes);
routes.use('/contatos', contatosRoutes);
routes.use('/crise', criseRoutes);
routes.use('/locais', locaisRoutes);
routes.use('/lgpd', lgpdRoutes);
