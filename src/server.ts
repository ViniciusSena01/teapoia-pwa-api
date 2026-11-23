import { app } from './app.js';

const PORT = Number(process.env.PORT) || 3333;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 [TEApoia API] Servidor online na porta ${PORT} (${HOST})`);
  console.log(`🧪 Painel Visual de Testes: /teste`);
  console.log(`🩺 Health Check: /api/health`);
  console.log(`🔐 Autenticação & Conta: /api/auth`);
  console.log(`🧘 Modo Crise, Respiração & CAA: /api/crise/protocolos`);
  console.log(`📓 Diário & Sync Local-First: /api/diario`);
  console.log(`🤝 Contatos de Confiança & SOS: /api/contatos`);
  console.log(`🌿 Catálogo de Locais Calmos: /api/locais`);
  console.log(`🛡️ Privacidade & Direitos LGPD: /api/lgpd/matriz-privacidade`);
});
