import { app } from './app.js';

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`🚀 [TEApoia API] Servidor rodando em http://localhost:${PORT}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📓 Diário: http://localhost:${PORT}/api/diario`);
  console.log(`🌿 Locais Calmos: http://localhost:${PORT}/api/locais`);
});

