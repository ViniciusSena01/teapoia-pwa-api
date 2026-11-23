import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { routes } from './routes/index.js';

dotenv.config();

export const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

// Rota raiz com catálogo completo de endpoints da API TEApoia
app.get('/', (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    servico: 'TEApoia REST API — Backend Oficial (TCC ADS)',
    status: 'online',
    versao: '1.0.0',
    painelInterativoNavegador: `${baseUrl}/teste`,
    modulos: {
      healthCheck: 'GET /api/health',
      autenticacaoConta: {
        cadastro: 'POST /api/auth/register',
        confirmarEmail: 'POST /api/auth/confirm-email',
        reenviarConfirmacao: 'POST /api/auth/resend-confirmation',
        login: 'POST /api/auth/login',
        esqueciSenha: 'POST /api/auth/forgot-password',
        redefinirSenha: 'POST /api/auth/reset-password',
        meuPerfil: 'GET /api/auth/me',
        preferenciasSensoriais: 'PATCH /api/auth/preferences'
      },
      modoCriseComunicacao: {
        protocolosSobrecargaRespiracaoCAA: 'GET /api/crise/protocolos'
      },
      redeDeApoioContatos: {
        canaisEmergenciaPublica: 'GET /api/contatos/emergencia-publica',
        listarContatos: 'GET /api/contatos',
        criarContato: 'POST /api/contatos',
        editarContato: 'PUT /api/contatos/:id',
        removerContato: 'DELETE /api/contatos/:id'
      },
      diarioLocalFirstSync: {
        listarDiario: 'GET /api/diario',
        criarRegistro: 'POST /api/diario',
        sincronizarLoteOffline: 'POST /api/diario/sync',
        editarRegistro: 'PUT /api/diario/:id',
        excluirRegistro: 'DELETE /api/diario/:id'
      },
      locaisCalmos: {
        catalogoComFiltros: 'GET /api/locais?categoria=&nivelRuido=&possuiDescompressao=',
        cadastrarLocal: 'POST /api/locais'
      },
      privacidadeLGPD: {
        matrizPrivacidadeRetencao: 'GET /api/lgpd/matriz-privacidade',
        gerenciarConsentimentos: 'POST /api/lgpd/consentimentos',
        exportarMeusDadosJSON: 'GET /api/lgpd/exportar',
        excluirMinhaContaCascata: 'DELETE /api/lgpd/excluir-conta'
      }
    }
  });
});

// Painel Interativo Completo no Navegador para Testes e Demonstração na Banca
app.get('/teste', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TEApoia API — Console de Homologação e Testes (TCC ADS)</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1020px; margin: 24px auto; padding: 0 16px; background: #f8fafc; color: #0f172a; }
    h1 { color: #1e3a8a; margin-bottom: 4px; }
    .sub { color: #475569; margin-top: 0; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 16px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .card h3 { margin-top: 0; color: #1e3a8a; font-size: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    button { background: #1e3a8a; color: #fff; border: none; padding: 8px 13px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; margin: 4px 4px 4px 0; }
    button:hover { background: #172554; }
    button.sec { background: #0f766e; }
    button.sec:hover { background: #115e59; }
    button.danger { background: #be123c; }
    button.danger:hover { background: #9f1239; }
    pre { background: #0f172a; color: #38bdf8; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; max-height: 420px; }
    input, select { padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; width: 100%; box-sizing: border-box; margin-bottom: 8px; font-size: 13px; }
    .status-bar { background: #e0f2fe; border: 1px solid #bae6fd; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>🚀 TEApoia API — Console de Homologação (TCC ADS)</h1>
  <p class="sub">Painel integrado para testar todos os módulos do Backend em 1 clique.</p>

  <div class="status-bar" id="token-status">
    🔓 <strong>Status da Sessão:</strong> Nenhum token JWT ativo. Faça o Cadastro e depois clique em Login no Card 1.
  </div>

  <div class="grid">
    <div class="card">
      <h3>1. Conta, Login & Preferências (TEA-04 a 16)</h3>
      <input id="reg-nome" placeholder="Nome" value="Vinicius Sena" />
      <input id="reg-email" placeholder="E-mail" value="vinicius@teapoia.app" />
      <input id="reg-senha" type="password" placeholder="Senha" value="senhaSegura123" />
      <button onclick="testarCadastro()">1. Cadastrar (POST)</button>
      <button class="sec" onclick="testarLogin()">2. Fazer Login (JWT)</button>
      <button onclick="chamarApi('GET', '/api/auth/me')">3. Ver Perfil (/me)</button>
      <button onclick="testarPreferencias()">4. Mudar Tema p/ Leitura (PATCH)</button>
    </div>

    <div class="card">
      <h3>2. Modo Crise, Respiração & CAA (TEA-11 a 14)</h3>
      <p style="font-size:13px;color:#475569;">Retorna estados de sobrecarga (1 a 4), exercícios de respiração (com alternativa estática) e cartões de voz CAA:</p>
      <button class="sec" onclick="chamarApi('GET', '/api/crise/protocolos')">GET /api/crise/protocolos</button>
      <button onclick="chamarApi('GET', '/api/contatos/emergencia-publica')">GET Canais Emergência (CVV 188)</button>
    </div>

    <div class="card">
      <h3>3. Diário & Sync Local-First (TEA-18 a 21)</h3>
      <input id="dia-humor" placeholder="Humor" value="sobrecarregado" />
      <input id="dia-nivel" type="number" min="1" max="5" value="4" />
      <input id="dia-relato" placeholder="Relato" value="Barulho intenso no transporte público hoje." />
      <button onclick="criarDiario()">Salvar Registro (POST /diario)</button>
      <button class="sec" onclick="testarSyncLote()">Testar Sync Offline Idempotente (/sync)</button>
      <button onclick="chamarApi('GET', '/api/diario')">Listar Meu Diário (GET)</button>
    </div>

    <div class="card">
      <h3>4. Contatos de Confiança (TEA-15)</h3>
      <input id="cont-nome" placeholder="Nome do Contato" value="Mãe (Apoio)" />
      <input id="cont-fone" placeholder="Telefone com DDD" value="11999998888" />
      <button onclick="criarContato()">Cadastrar Contato (POST)</button>
      <button class="sec" onclick="chamarApi('GET', '/api/contatos')">Listar Contatos + Links WhatsApp</button>
    </div>

    <div class="card">
      <h3>5. Catálogo de Locais Calmos (TEA-24)</h3>
      <button class="sec" onclick="chamarApi('GET', '/api/locais')">Listar Todos os Locais</button>
      <button onclick="chamarApi('GET', '/api/locais?nivelRuido=Silencioso')">Filtrar: Silenciosos</button>
      <button onclick="chamarApi('GET', '/api/locais?possuiDescompressao=true')">Filtrar: Com Sala Sensorial</button>
    </div>

    <div class="card">
      <h3>6. Privacidade & Direitos LGPD (TEA-08, 09, 22)</h3>
      <button onclick="chamarApi('GET', '/api/lgpd/matriz-privacidade')">Matriz de Dados & Retenção</button>
      <button class="sec" onclick="chamarApi('GET', '/api/lgpd/exportar')">Exportar Todos os Meus Dados (JSON)</button>
      <button class="danger" onclick="excluirConta()">Excluir Conta em Cascata (DELETE)</button>
    </div>
  </div>

  <h3>Resposta JSON da API:</h3>
  <pre id="resultado">Clique em qualquer botão acima para inspecionar a resposta em tempo real...</pre>

  <script>
    let tokenSalvo = '';
    const out = document.getElementById('resultado');
    const status = document.getElementById('token-status');

    function atualizarStatusToken(email) {
      if (tokenSalvo) {
        status.innerHTML = '🔐 <strong>Sessão Autenticada (JWT Ativo):</strong> ' + email + ' — Todas as rotas privadas estão liberadas!';
        status.style.background = '#dcfce7';
        status.style.borderColor = '#86efac';
      }
    }

    async function chamarApi(method, url, bodyObj) {
      const headers = { 'Content-Type': 'application/json' };
      if (tokenSalvo) headers['Authorization'] = 'Bearer ' + tokenSalvo;
      const res = await fetch(url, {
        method,
        headers,
        body: bodyObj ? JSON.stringify(bodyObj) : undefined
      });
      const data = await res.json();
      out.textContent = method + ' ' + url + ' (Status ' + res.status + ')\\n\\n' + JSON.stringify(data, null, 2);
      return data;
    }

    async function testarCadastro() {
      await chamarApi('POST', '/api/auth/register', {
        nome: document.getElementById('reg-nome').value,
        email: document.getElementById('reg-email').value,
        senha: document.getElementById('reg-senha').value,
        consentimentoPrivacidade: true,
        consentimentoSincronizacaoDiario: true
      });
    }

    async function testarLogin() {
      const email = document.getElementById('reg-email').value;
      const data = await chamarApi('POST', '/api/auth/login', {
        email,
        senha: document.getElementById('reg-senha').value
      });
      if (data.token) {
        tokenSalvo = data.token;
        atualizarStatusToken(email);
      }
    }

    async function testarPreferencias() {
      await chamarApi('PATCH', '/api/auth/preferences', {
        temaPreferido: 'reading',
        tamanhoFonte: 'large',
        reduzirMovimento: true
      });
    }

    async function criarDiario() {
      await chamarApi('POST', '/api/diario', {
        humor: document.getElementById('dia-humor').value,
        nivelSobrecarga: Number(document.getElementById('dia-nivel').value),
        gatilhos: ['ruido_intenso', 'multidao'],
        relato: document.getElementById('dia-relato').value
      });
    }

    async function testarSyncLote() {
      await chamarApi('POST', '/api/diario/sync', {
        registros: [
          {
            clientId: 'dexie-local-001',
            humor: 'calmo',
            nivelSobrecarga: 1,
            gatilhos: ['ambiente_silencioso'],
            relato: 'Registro salvo offline no celular e sincronizado com clientId idempotente.'
          },
          {
            clientId: 'dexie-local-002',
            humor: 'ansioso',
            nivelSobrecarga: 3,
            gatilhos: ['luz_fluorescente'],
            relato: 'Segundo registro do lote offline.'
          }
        ]
      });
    }

    async function criarContato() {
      await chamarApi('POST', '/api/contatos', {
        nome: document.getElementById('cont-nome').value,
        telefone: document.getElementById('cont-fone').value,
        parentesco: 'Familiar',
        mensagemPadrao: 'Olá, estou em sobrecarga sensorial e preciso do seu apoio agora.'
      });
    }

    async function excluirConta() {
      if (!confirm('Tem certeza que deseja testar a exclusão completa da conta (LGPD Cascade Delete)?')) return;
      const res = await chamarApi('DELETE', '/api/lgpd/excluir-conta', {
        confirmacao: 'EXCLUIR MINHA CONTA'
      });
      if (res.sucesso) {
        tokenSalvo = '';
        status.innerHTML = '🗑️ <strong>Conta excluída com sucesso (LGPD):</strong> Cadastre ou faça login novamente para continuar testando.';
        status.style.background = '#fee2e2';
      }
    }
  </script>
</body>
</html>`);
});

// Rotas com prefixo da API
app.use('/api', routes);
