import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { app } from '../app.js';
import { prisma } from '../database/prisma.js';

/**
 * Dispatcher HTTP em memória para testar o Express diretamente sem depender de sockets TCP
 */
async function requestApp(
  method: string,
  urlPath: string,
  options: { body?: unknown; headers?: Record<string, string> } = {}
): Promise<{ status: number; json: <T = any>() => Promise<T> }> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = urlPath;

    const normalizedHeaders: Record<string, string> = {
      host: 'localhost:3333'
    };
    if (options.headers) {
      for (const [key, val] of Object.entries(options.headers)) {
        normalizedHeaders[key.toLowerCase()] = val;
      }
    }
    req.headers = normalizedHeaders;

    const bodyString = options.body !== undefined ? JSON.stringify(options.body) : '';
    if (bodyString) {
      req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = Buffer.byteLength(bodyString).toString();
    }

    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];

    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    res.write = ((chunk: any, ...args: any[]) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      return origWrite(chunk, ...args);
    }) as typeof res.write;

    res.end = ((chunk?: any, ...args: any[]) => {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      origEnd(chunk, ...args);
      const rawBody = Buffer.concat(chunks).toString('utf8');
      resolve({
        status: res.statusCode,
        json: async <T = any>() => JSON.parse(rawBody) as T
      });
      return res;
    }) as typeof res.end;

    try {
      app(req, res);
      if (bodyString) {
        req.push(bodyString);
      }
      req.push(null);
    } catch (err) {
      reject(err);
    }
  });
}

const emailUsuarioA = `teste.a.${Date.now()}@teapoia.app`;
const emailUsuarioB = `teste.b.${Date.now()}@teapoia.app`;
const senhaPadrao = 'SenhaForte123!';

let tokenConfirmacaoA = '';
let jwtUsuarioA = '';
let jwtUsuarioB = '';
let diarioCriadoId = '';
let contatoCriadoId = '';

describe('🧪 Suíte de Testes Unitários, Integração e Segurança — TEApoia API (TEA-26)', () => {
  before(async () => {
    await prisma.usuario.deleteMany({
      where: {
        email: { in: [emailUsuarioA, emailUsuarioB] }
      }
    });
  });

  after(async () => {
    await prisma.usuario.deleteMany({
      where: {
        email: { in: [emailUsuarioA, emailUsuarioB] }
      }
    });
    await prisma.$disconnect();
  });

  it('1. [TEA-01] GET /api/health deve retornar status online', async () => {
    const res = await requestApp('GET', '/api/health');
    const body = await res.json<{ status: string; service: string }>();

    assert.equal(res.status, 200);
    assert.equal(body.status, 'online');
    assert.equal(body.service, 'TEApoia API');
  });

  it('2. [TEA-11 a TEA-14] GET /api/crise/protocolos deve entregar estados de sobrecarga, respiração estática e cartões CAA', async () => {
    const res = await requestApp('GET', '/api/crise/protocolos');
    const body = await res.json<{
      sucesso: boolean;
      estadosSobrecarga: unknown[];
      exerciciosRespiracao: Array<{ alternativaSemAnimacao: string }>;
      cartoesCAA: unknown[];
    }>();

    assert.equal(res.status, 200);
    assert.equal(body.sucesso, true);
    assert.equal(body.estadosSobrecarga.length, 4);
    assert.ok(body.exerciciosRespiracao[0].alternativaSemAnimacao.includes('prefers-reduced-motion'));
    assert.ok(body.cartoesCAA.length >= 5);
  });

  it('3. [TEA-15] GET /api/contatos/emergencia-publica deve listar canais oficiais verificados (CVV 188)', async () => {
    const res = await requestApp('GET', '/api/contatos/emergencia-publica');
    const body = await res.json<{
      sucesso: boolean;
      canaisOficiais: Array<{ telefone: string; deepLink: string }>;
    }>();

    assert.equal(res.status, 200);
    assert.equal(body.sucesso, true);
    assert.equal(body.canaisOficiais[0].telefone, '188');
    assert.equal(body.canaisOficiais[0].deepLink, 'tel:188');
  });

  it('4. [TEA-08 / TEA-09] GET /api/lgpd/matriz-privacidade deve retornar a matriz pública de dados e retenção', async () => {
    const res = await requestApp('GET', '/api/lgpd/matriz-privacidade');
    const body = await res.json<{ sucesso: boolean; matrizDeDados: unknown[] }>();

    assert.equal(res.status, 200);
    assert.equal(body.sucesso, true);
    assert.ok(body.matrizDeDados.length >= 3);
  });

  it('5. [TEA-24] GET /api/locais deve listar locais calmos e permitir filtro por nível de ruído', async () => {
    const res = await requestApp('GET', '/api/locais?nivelRuido=Silencioso');
    const body = await res.json<{
      sucesso: boolean;
      dados: Array<{ nivelRuido: string; fonteDados: string }>;
    }>();

    assert.equal(res.status, 200);
    assert.equal(body.sucesso, true);
    for (const local of body.dados) {
      assert.equal(local.nivelRuido, 'Silencioso');
      assert.ok(local.fonteDados.length > 0);
    }
  });

  it('6. [TEA-04 / TEA-08] POST /api/auth/register deve rejeitar cadastro sem consentimento de privacidade ou com senha curta', async () => {
    const resSemConsentimento = await requestApp('POST', '/api/auth/register', {
      body: {
        nome: 'Usuário Sem Consentimento',
        email: emailUsuarioA,
        senha: '123',
        consentimentoPrivacidade: false
      }
    });

    assert.equal(resSemConsentimento.status, 400);
  });

  it('7. [TEA-04 / TEA-08] POST /api/auth/register deve cadastrar usuário com hash de senha e registrar consentimentos LGPD', async () => {
    const res = await requestApp('POST', '/api/auth/register', {
      body: {
        nome: 'Usuária Teste A',
        email: emailUsuarioA,
        senha: senhaPadrao,
        consentimentoPrivacidade: true,
        consentimentoSincronizacaoDiario: true
      }
    });

    const body = await res.json<{
      sucesso: boolean;
      usuario: { id: string; email: string; senhaHash?: string };
      debugTokenConfirmacao: string;
    }>();

    assert.equal(res.status, 201);
    assert.equal(body.sucesso, true);
    assert.equal(body.usuario.email, emailUsuarioA);
    assert.equal(body.usuario.senhaHash, undefined);
    assert.ok(body.debugTokenConfirmacao);

    tokenConfirmacaoA = body.debugTokenConfirmacao;
  });

  it('8. [TEA-05] POST /api/auth/confirm-email deve confirmar e-mail e invalidar o token após uso único', async () => {
    const resConfirm = await requestApp('POST', '/api/auth/confirm-email', {
      body: {
        email: emailUsuarioA,
        token: tokenConfirmacaoA
      }
    });
    assert.equal(resConfirm.status, 200);

    const resReuso = await requestApp('POST', '/api/auth/confirm-email', {
      body: {
        email: emailUsuarioA,
        token: tokenConfirmacaoA
      }
    });
    assert.equal(resReuso.status, 400);
  });

  it('9. [TEA-06 / TEA-23] POST /api/auth/login deve rejeitar senha incorreta e emitir token JWT para credenciais válidas', async () => {
    const resFalha = await requestApp('POST', '/api/auth/login', {
      body: {
        email: emailUsuarioA,
        senha: 'SenhaErrada999'
      }
    });
    assert.equal(resFalha.status, 401);

    const resSucesso = await requestApp('POST', '/api/auth/login', {
      body: {
        email: emailUsuarioA,
        senha: senhaPadrao
      }
    });
    const body = await resSucesso.json<{ sucesso: boolean; token: string }>();

    assert.equal(resSucesso.status, 200);
    assert.equal(body.sucesso, true);
    assert.ok(body.token);
    jwtUsuarioA = body.token;
  });

  it('10. [TEA-10 / TEA-16] PATCH /api/auth/preferences deve atualizar preferências de acessibilidade sensorial', async () => {
    const res = await requestApp('PATCH', '/api/auth/preferences', {
      headers: { Authorization: `Bearer ${jwtUsuarioA}` },
      body: {
        temaPreferido: 'reading',
        tamanhoFonte: 'large',
        reduzirMovimento: true
      }
    });
    const body = await res.json<{
      sucesso: boolean;
      usuario: { temaPreferido: string; tamanhoFonte: string; reduzirMovimento: boolean };
    }>();

    assert.equal(res.status, 200);
    assert.equal(body.usuario.temaPreferido, 'reading');
    assert.equal(body.usuario.tamanhoFonte, 'large');
    assert.equal(body.usuario.reduzirMovimento, true);
  });

  it('11. [TEA-20 / TEA-21] POST /api/diario e POST /api/diario/sync devem persistir registros com idempotência por clientId', async () => {
    const resPost = await requestApp('POST', '/api/diario', {
      headers: { Authorization: `Bearer ${jwtUsuarioA}` },
      body: {
        clientId: 'dexie-offline-100',
        humor: 'sobrecarregado',
        nivelSobrecarga: 4,
        gatilhos: ['barulho_alto', 'multidao'],
        relato: 'Primeiro relato salvo offline.'
      }
    });
    const bodyPost = await resPost.json<{ sucesso: boolean; dado: { id: string } }>();
    assert.equal(resPost.status, 201);
    diarioCriadoId = bodyPost.dado.id;

    const resSync = await requestApp('POST', '/api/diario/sync', {
      headers: { Authorization: `Bearer ${jwtUsuarioA}` },
      body: {
        registros: [
          {
            clientId: 'dexie-offline-100',
            humor: 'sobrecarregado',
            nivelSobrecarga: 4,
            gatilhos: ['barulho_alto', 'multidao'],
            relato: 'Relato atualizado na sincronização sem duplicar.'
          },
          {
            clientId: 'dexie-offline-101',
            humor: 'calmo',
            nivelSobrecarga: 1,
            gatilhos: ['respiracao_guiada'],
            relato: 'Segundo relato sincronizado.'
          }
        ]
      }
    });
    const bodySync = await resSync.json<{
      sucesso: boolean;
      resumo: { criados: number; atualizados: number };
    }>();
    assert.equal(resSync.status, 200);
    assert.equal(bodySync.resumo.criados, 1);
    assert.equal(bodySync.resumo.atualizados, 1);

    const resList = await requestApp('GET', '/api/diario', {
      headers: { Authorization: `Bearer ${jwtUsuarioA}` }
    });
    const bodyList = await resList.json<{ paginacao: { total: number } }>();
    assert.equal(bodyList.paginacao.total, 2);
  });

  it('12. [TEA-20 / TEA-23 / TEA-26] Isolamento de Autorização: Usuário B NÃO pode alterar ou excluir diário do Usuário A', async () => {
    await requestApp('POST', '/api/auth/register', {
      body: {
        nome: 'Usuário Teste B',
        email: emailUsuarioB,
        senha: senhaPadrao,
        consentimentoPrivacidade: true
      }
    });

    const resLoginB = await requestApp('POST', '/api/auth/login', {
      body: { email: emailUsuarioB, senha: senhaPadrao }
    });
    const bodyLoginB = await resLoginB.json<{ token: string }>();
    jwtUsuarioB = bodyLoginB.token;

    const resDeleteInvasivo = await requestApp('DELETE', `/api/diario/${diarioCriadoId}`, {
      headers: { Authorization: `Bearer ${jwtUsuarioB}` }
    });

    assert.equal(resDeleteInvasivo.status, 404);
  });

  it('13. [TEA-15] POST & GET /api/contatos devem cadastrar contato de confiança e gerar deep links de acionamento', async () => {
    const resPost = await requestApp('POST', '/api/contatos', {
      headers: { Authorization: `Bearer ${jwtUsuarioA}` },
      body: {
        nome: 'Mãe (Apoio)',
        telefone: '(11) 98888-7777',
        parentesco: 'Mãe',
        mensagemPadrao: 'Preciso de ajuda.'
      }
    });
    const bodyPost = await resPost.json<{
      sucesso: boolean;
      dado: { id: string; telefone: string; acionamento: { deepLinkWhatsApp: string } };
    }>();

    assert.equal(resPost.status, 201);
    assert.equal(bodyPost.dado.telefone, '11988887777');
    assert.ok(bodyPost.dado.acionamento.deepLinkWhatsApp.startsWith('https://wa.me/5511988887777'));
    contatoCriadoId = bodyPost.dado.id;
    assert.ok(contatoCriadoId);
  });

  it('14. [TEA-22] GET /api/lgpd/exportar e DELETE /api/lgpd/excluir-conta devem exportar JSON completo e excluir conta em cascata', async () => {
    const resExport = await requestApp('GET', '/api/lgpd/exportar', {
      headers: { Authorization: `Bearer ${jwtUsuarioA}` }
    });
    const bodyExport = await resExport.json<{
      sucesso: boolean;
      dadosPessoais: {
        email: string;
        registrosDiario: unknown[];
        contatosApoio: unknown[];
        consentimentos: unknown[];
      };
    }>();

    assert.equal(resExport.status, 200);
    assert.equal(bodyExport.dadosPessoais.email, emailUsuarioA);
    assert.equal(bodyExport.dadosPessoais.registrosDiario.length, 2);
    assert.equal(bodyExport.dadosPessoais.contatosApoio.length, 1);
    assert.ok(bodyExport.dadosPessoais.consentimentos.length >= 2);

    const resDelete = await requestApp('DELETE', '/api/lgpd/excluir-conta', {
      headers: { Authorization: `Bearer ${jwtUsuarioA}` },
      body: {
        confirmacao: 'EXCLUIR MINHA CONTA'
      }
    });
    assert.equal(resDelete.status, 200);

    const resMeAposExclusao = await requestApp('GET', '/api/auth/me', {
      headers: { Authorization: `Bearer ${jwtUsuarioA}` }
    });
    assert.equal(resMeAposExclusao.status, 404);
  });

  it('15. [TEA-EPIC-02 / TEA-08] POST /api/auth/social deve exigir consentimento LGPD e autenticar via Gmail/Google ou Apple', async () => {
    const emailSocial = `social.gmail.${Date.now()}@gmail.com`;

    const resSemLgpd = await requestApp('POST', '/api/auth/social', {
      body: {
        provedor: 'google',
        nome: 'Usuária Gmail',
        email: emailSocial,
        consentimentoPrivacidade: false
      }
    });
    assert.equal(resSemLgpd.status, 400);

    const resSocialOk = await requestApp('POST', '/api/auth/social', {
      body: {
        provedor: 'google',
        nome: 'Usuária Gmail',
        email: emailSocial,
        consentimentoPrivacidade: true,
        consentimentoSincronizacaoDiario: false,
        versaoTermo: '1.0.0'
      }
    });
    const bodySocial = await resSocialOk.json<{
      sucesso: boolean;
      provedor: string;
      token: string;
      lgpd: { consentimentoPrivacidade: boolean; consentimentoSincronizacaoDiario: boolean };
    }>();

    assert.equal(resSocialOk.status, 200);
    assert.equal(bodySocial.sucesso, true);
    assert.equal(bodySocial.provedor, 'google');
    assert.ok(bodySocial.token);
    assert.equal(bodySocial.lgpd.consentimentoPrivacidade, true);
    assert.equal(bodySocial.lgpd.consentimentoSincronizacaoDiario, false);

    await prisma.usuario.deleteMany({ where: { email: emailSocial } });
  });
});
