import { PrismaClient } from '@prisma/client';

// Instância singleton do PrismaClient
// Regra TEA-23 (Privacidade/LGPD): Não habilitamos log de 'query' para evitar que
// relatos íntimos do diário, tokens ou dados pessoais vazem nos logs do servidor.
export const prisma = new PrismaClient({
  log: ['error', 'warn']
});
