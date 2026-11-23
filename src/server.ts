import { app } from './app.js';

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`🚀 [TEApoia API] Servidor rodando em http://localhost:${PORT}`);
  console.log(`🧪 Painel Visual de Testes (Navegador): http://localhost:3333/teste`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Autenticação & Conta: http://localhost:${PORT}/api/auth`);
  console.log(`🧘 Modo Crise, Respiração & CAA: http://localhost:${PORT}/api/crise/protocolos`);
  console.log(`📓 Diário & Sync Local-First: http://localhost:${PORT}/api/diario`);
  console.log(`🤝 Contatos de Confiança & SOS: http://localhost:${PORT}/api/contatos`);
  console.log(`🌿 Catálogo de Locais Calmos: http://localhost:${PORT}/api/locais`);
  console.log(`🛡️ Privacidade & Direitos LGPD: http://localhost:${PORT}/api/lgpd/matriz-privacidade`);
});
