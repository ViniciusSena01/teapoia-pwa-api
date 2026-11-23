// =============================================================================
// TEApoia API — Script de Inicialização Automática em Nuvem (Railway / Render)
// Garante que DATABASE_URL tenha fallback seguro, aplica migrations, roda o
// seed inicial de locais calmos e inicia o servidor na porta da nuvem.
// =============================================================================

import { execSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
  console.log('ℹ️ [Cloud Boot] DATABASE_URL não definida no painel; usando banco embarcado SQLite (file:./dev.db).');
}

try {
  console.log('🔄 [Cloud Boot] Aplicando migrations do Prisma no banco de produção...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });

  console.log('🌱 [Cloud Boot] Garantindo seed inicial de Locais Calmos...');
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', env: process.env });
} catch (err) {
  console.warn('⚠️ [Cloud Boot] Aviso ao sincronizar schema inicial:', err);
}

console.log('🚀 [Cloud Boot] Iniciando servidor HTTP TEApoia...');
await import('../dist/server.js');
