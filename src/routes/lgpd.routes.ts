import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database/prisma.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const lgpdRoutes = Router();

const AtualizarConsentimentoSchema = z.object({
  finalidade: z.enum([
    'termos_privacidade_conta',
    'sincronizacao_nuvem_diario',
    'geolocalizacao_opcional_locais'
  ]),
  aceito: z.boolean(),
  versaoTermo: z.string().trim().default('1.0.0')
});

const ConfirmarExclusaoContaSchema = z.object({
  confirmacao: z
    .string()
    .trim()
    .refine((val) => val === 'EXCLUIR MINHA CONTA', {
      message: 'Para confirmar a exclusão permanente, envie o campo confirmacao com o valor exato: "EXCLUIR MINHA CONTA".'
    })
});

// 1. MATRIZ PÚBLICA DE DADOS, RETENÇÃO E PRIVACIDADE (TEA-08 & TEA-09)
lgpdRoutes.get('/matriz-privacidade', (_req: Request, res: Response): void => {
  res.json({
    sucesso: true,
    versaoAviso: '1.0.0',
    atualizadoEm: '2026-11-19',
    principiosLGPD: [
      'Minimização de Dados: Coletamos apenas o estritamente necessário para a operação da conta e backup opcional.',
      'Modo Visitante Pleno: Ferramentas de respiração, modo crise e cartões CAA funcionam sem exigir cadastro.',
      'Transparência e Controle: O titular pode exportar tudo em JSON ou excluir sua conta e dados em cascata a qualquer momento.'
    ],
    matrizDeDados: [
      {
        categoria: 'Dados de Identificação e Conta',
        campos: ['nome', 'email', 'senhaHash (bcrypt)'],
        finalidade: 'Autenticação do usuário e proteção de acesso aos dados sincronizados.',
        baseLegal: 'Execução de procedimentos preliminares / Consentimento do titular.',
        armazenamento: 'Servidor Backend (Banco Relacional)',
        retencao: 'Enquanto a conta estiver ativa ou até solicitação de exclusão pelo titular.'
      },
      {
        categoria: 'Diário Sensorial e Autorregulação',
        campos: ['humor', 'nivelSobrecarga (1 a 5)', 'gatilhos', 'relato opcional'],
        finalidade: 'Permitir ao próprio usuário acompanhar seus padrões sensoriais ao longo do tempo.',
        baseLegal: 'Consentimento específico e destacado do titular (Art. 11 LGPD).',
        armazenamento:
          'Primariamente Local (IndexedDB/Dexie no dispositivo); Sincronização em nuvem somente para usuários autenticados com consentimento ativo.',
        retencao: 'Até exclusão individual do registro ou exclusão da conta.'
      },
      {
        categoria: 'Contatos de Confiança',
        campos: ['nome', 'telefone', 'parentesco', 'mensagemPadrao'],
        finalidade: 'Gerar atalhos rápidos de ligação ou WhatsApp acionados manualmente pelo usuário.',
        baseLegal: 'Consentimento do titular.',
        armazenamento: 'Local e sincronizado na conta do titular.',
        retencao: 'Até remoção pelo usuário ou exclusão da conta.'
      }
    ],
    medidasSegurancaMitigacao: [
      'Senhas processadas exclusivamente via hash bcrypt (10 rounds).',
      'Logs do servidor configurados para não imprimir payloads de diário, senhas ou tokens (TEA-23).',
      'Isolamento estrito de propriedade: todas as queries verificam o usuarioId extraído do JWT.',
      'Rate limiting em endpoints críticos de autenticação e recuperação.'
    ]
  });
});

// 2. REGISTRAR OU REVOGAR CONSENTIMENTO ESPECÍFICO (TEA-08)
lgpdRoutes.post('/consentimentos', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const validacao = AtualizarConsentimentoSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  const usuarioId = req.usuario!.id;
  const { finalidade, aceito, versaoTermo } = validacao.data;

  try {
    const novoRegistro = await prisma.consentimento.create({
      data: {
        usuarioId,
        finalidade,
        versaoTermo,
        aceito,
        revogadoEm: aceito ? null : new Date()
      }
    });

    res.status(201).json({
      sucesso: true,
      mensagem: aceito
        ? `Consentimento para "${finalidade}" registrado com sucesso.`
        : `Consentimento para "${finalidade}" revogado com sucesso.`,
      consentimento: novoRegistro
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao registrar alteração de consentimento.'
    });
  }
});

// 3. EXPORTAÇÃO COMPLETA DE DADOS PESSOAIS DO TITULAR (Portabilidade — TEA-22)
lgpdRoutes.get('/exportar', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const usuarioId = req.usuario!.id;

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        emailConfirmado: true,
        temaPreferido: true,
        tamanhoFonte: true,
        reduzirMovimento: true,
        criadoEm: true,
        atualizadoEm: true,
        consentimentos: {
          orderBy: { registradoEm: 'desc' }
        },
        contatosApoio: {
          orderBy: { criadoEm: 'asc' }
        },
        registrosDiario: {
          orderBy: { criadoEm: 'desc' }
        }
      }
    });

    if (!usuario) {
      res.status(404).json({
        sucesso: false,
        mensagem: 'Titular não encontrado.'
      });
      return;
    }

    res.json({
      sucesso: true,
      metadadosExportacao: {
        projeto: 'TEApoia',
        formato: 'JSON Estruturado (Direito de Acesso e Portabilidade LGPD)',
        exportadoEm: new Date().toISOString(),
        titularId: usuario.id
      },
      dadosPessoais: usuario
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao gerar pacote de exportação de dados.'
    });
  }
});

// 4. EXCLUSÃO DEFINITIVA DA CONTA E TODOS OS DADOS EM NUVEM (TEA-22)
lgpdRoutes.delete('/excluir-conta', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const validacao = ConfirmarExclusaoContaSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  const usuarioId = req.usuario!.id;

  try {
    const existente = await prisma.usuario.findUnique({
      where: { id: usuarioId }
    });

    if (!existente) {
      res.status(404).json({
        sucesso: false,
        mensagem: 'Conta não encontrada.'
      });
      return;
    }

    await prisma.usuario.delete({
      where: { id: usuarioId }
    });

    res.json({
      sucesso: true,
      mensagem:
        'Sua conta e todos os seus registros sincronizados na nuvem (diário, contatos e preferências) foram permanentemente excluídos. Para remover dados salvos apenas no navegador do seu aparelho, utilize também a opção "Limpar Dados Locais" no aplicativo.'
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao processar a exclusão da conta.'
    });
  }
});
