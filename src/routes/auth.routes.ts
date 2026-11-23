import { Router, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../database/prisma.js';
import { requireAuth, rateLimitSensivel } from '../middlewares/auth.middleware.js';

export const authRoutes = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'teapoia-dev-secret-change-in-production-2026';

// Schemas compatíveis com Zod v3 e v4
const CadastroSchema = z.object({
  nome: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido'),
  senha: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .max(72, 'A senha deve ter no máximo 72 caracteres'),
  consentimentoPrivacidade: z
    .boolean()
    .refine((val) => val === true, {
      message: 'É obrigatório aceitar o Aviso de Privacidade (LGPD) para criar conta.'
    }),
  consentimentoSincronizacaoDiario: z.boolean().optional().default(true),
  versaoTermo: z.string().optional().default('1.0.0')
});

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido'),
  senha: z.string().min(1, 'A senha é obrigatória')
});

const ConfirmarEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido'),
  token: z.string().trim().min(6, 'Token inválido')
});

const SolicitarRecuperacaoSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido')
});

const RedefinirSenhaSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido'),
  token: z.string().trim().min(6, 'Código de recuperação inválido'),
  novaSenha: z
    .string()
    .min(8, 'A nova senha deve ter no mínimo 8 caracteres')
    .max(72, 'A nova senha deve ter no máximo 72 caracteres')
});

const PreferenciasSensoriaisSchema = z.object({
  nome: z.string().trim().min(2).max(100).optional(),
  temaPreferido: z.enum(['default', 'dark', 'reading', 'high-contrast']).optional(),
  tamanhoFonte: z.enum(['normal', 'large', 'xlarge']).optional(),
  reduzirMovimento: z.boolean().optional()
});

// 1. CADASTRO DE USUÁRIO + REGISTRO DE CONSENTIMENTO LGPD (TEA-04 & TEA-08)
authRoutes.post('/register', rateLimitSensivel(10, 15), async (req: Request, res: Response): Promise<void> => {
  const validacao = CadastroSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  const {
    nome,
    email,
    senha,
    consentimentoPrivacidade,
    consentimentoSincronizacaoDiario,
    versaoTermo
  } = validacao.data;

  try {
    const existente = await prisma.usuario.findUnique({ where: { email } });

    if (existente) {
      res.status(409).json({
        sucesso: false,
        mensagem: 'Não foi possível concluir o cadastro com os dados informados. Verifique se você já possui conta.'
      });
      return;
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const tokenConfirmacao = randomBytes(16).toString('hex');
    const tokenConfirmacaoExpira = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash,
        emailConfirmado: false,
        tokenConfirmacao,
        tokenConfirmacaoExpira,
        consentimentos: {
          create: [
            {
              finalidade: 'termos_privacidade_conta',
              versaoTermo,
              aceito: consentimentoPrivacidade
            },
            {
              finalidade: 'sincronizacao_nuvem_diario',
              versaoTermo,
              aceito: consentimentoSincronizacaoDiario
            }
          ]
        }
      },
      select: {
        id: true,
        nome: true,
        email: true,
        emailConfirmado: true,
        temaPreferido: true,
        tamanhoFonte: true,
        reduzirMovimento: true,
        criadoEm: true
      }
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Conta criada com sucesso! Confirme seu e-mail para ativar todos os recursos.',
      usuario: novoUsuario,
      ...(process.env.NODE_ENV !== 'production' && { debugTokenConfirmacao: tokenConfirmacao })
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao processar cadastro.'
    });
  }
});

// 2. CONFIRMAÇÃO DE E-MAIL E REENVIO DE TOKEN (TEA-05)
authRoutes.post('/confirm-email', rateLimitSensivel(10, 15), async (req: Request, res: Response): Promise<void> => {
  const validacao = ConfirmarEmailSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  const { email, token } = validacao.data;

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (
      !usuario ||
      !usuario.tokenConfirmacao ||
      usuario.tokenConfirmacao !== token ||
      !usuario.tokenConfirmacaoExpira ||
      usuario.tokenConfirmacaoExpira < new Date()
    ) {
      res.status(400).json({
        sucesso: false,
        mensagem: 'Token de confirmação inválido ou expirado.'
      });
      return;
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        emailConfirmado: true,
        tokenConfirmacao: null,
        tokenConfirmacaoExpira: null
      }
    });

    res.json({
      sucesso: true,
      mensagem: 'E-mail confirmado com sucesso!'
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao confirmar e-mail.'
    });
  }
});

authRoutes.post('/resend-confirmation', rateLimitSensivel(5, 15), async (req: Request, res: Response): Promise<void> => {
  const validacao = SolicitarRecuperacaoSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  const { email } = validacao.data;

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario || usuario.emailConfirmado) {
      res.json({
        sucesso: true,
        mensagem: 'Se a conta existir e estiver pendente, um novo código de confirmação foi gerado.'
      });
      return;
    }

    const novoToken = randomBytes(16).toString('hex');
    const novaExpiracao = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tokenConfirmacao: novoToken,
        tokenConfirmacaoExpira: novaExpiracao
      }
    });

    res.json({
      sucesso: true,
      mensagem: 'Novo código de confirmação gerado com sucesso.',
      ...(process.env.NODE_ENV !== 'production' && { debugTokenConfirmacao: novoToken })
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao reenviar confirmação.'
    });
  }
});

// 3. LOGIN E EMISSÃO DE SESSÃO JWT (TEA-06)
authRoutes.post('/login', rateLimitSensivel(10, 15), async (req: Request, res: Response): Promise<void> => {
  const validacao = LoginSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  const { email, senha } = validacao.data;

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario) {
      res.status(401).json({
        sucesso: false,
        mensagem: 'Credenciais inválidas.'
      });
      return;
    }

    if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
      res.status(423).json({
        sucesso: false,
        mensagem: 'Conta temporariamente bloqueada por excesso de tentativas. Aguarde alguns minutos.'
      });
      return;
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);

    if (!senhaCorreta) {
      res.status(401).json({
        sucesso: false,
        mensagem: 'Credenciais inválidas.'
      });
      return;
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso.',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        emailConfirmado: usuario.emailConfirmado,
        temaPreferido: usuario.temaPreferido,
        tamanhoFonte: usuario.tamanhoFonte,
        reduzirMovimento: usuario.reduzirMovimento
      }
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao realizar login.'
    });
  }
});

// 4. RECUPERAÇÃO E REDEFINIÇÃO DE SENHA (TEA-07)
authRoutes.post('/forgot-password', rateLimitSensivel(5, 15), async (req: Request, res: Response): Promise<void> => {
  const validacao = SolicitarRecuperacaoSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  const { email } = validacao.data;

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario) {
      res.json({
        sucesso: true,
        mensagem: 'Se o e-mail estiver cadastrado, enviamos as instruções de recuperação.'
      });
      return;
    }

    const tokenRecuperacao = randomBytes(16).toString('hex');
    const tokenRecuperacaoExpira = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tokenRecuperacao,
        tokenRecuperacaoExpira,
        tentativasRecuperacao: 0
      }
    });

    res.json({
      sucesso: true,
      mensagem: 'Se o e-mail estiver cadastrado, enviamos as instruções de recuperação.',
      ...(process.env.NODE_ENV !== 'production' && { debugTokenRecuperacao: tokenRecuperacao })
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao processar recuperação de senha.'
    });
  }
});

authRoutes.post('/reset-password', rateLimitSensivel(8, 15), async (req: Request, res: Response): Promise<void> => {
  const validacao = RedefinirSenhaSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  const { email, token, novaSenha } = validacao.data;

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario || !usuario.tokenRecuperacao || !usuario.tokenRecuperacaoExpira) {
      res.status(400).json({
        sucesso: false,
        mensagem: 'Solicitação de redefinição inválida ou expirada.'
      });
      return;
    }

    if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
      res.status(423).json({
        sucesso: false,
        mensagem: 'Muitas tentativas inválidas. Aguarde 15 minutos antes de tentar novamente.'
      });
      return;
    }

    if (usuario.tokenRecuperacaoExpira < new Date() || usuario.tokenRecuperacao !== token) {
      const novasTentativas = usuario.tentativasRecuperacao + 1;
      const bloquear = novasTentativas >= 5;

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          tentativasRecuperacao: novasTentativas,
          ...(bloquear && { bloqueadoAte: new Date(Date.now() + 15 * 60 * 1000) })
        }
      });

      res.status(400).json({
        sucesso: false,
        mensagem: 'Código de recuperação inválido ou expirado.'
      });
      return;
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash: novaSenhaHash,
        tokenRecuperacao: null,
        tokenRecuperacaoExpira: null,
        tentativasRecuperacao: 0,
        bloqueadoAte: null
      }
    });

    res.json({
      sucesso: true,
      mensagem: 'Senha redefinida com sucesso! Você já pode fazer login.'
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao redefinir senha.'
    });
  }
});

// 5. PERFIL E PREFERÊNCIAS DE ACESSIBILIDADE SENSORIAL (TEA-10 & TEA-16)
authRoutes.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario!.id },
      select: {
        id: true,
        nome: true,
        email: true,
        emailConfirmado: true,
        temaPreferido: true,
        tamanhoFonte: true,
        reduzirMovimento: true,
        criadoEm: true,
        consentimentos: {
          select: {
            id: true,
            finalidade: true,
            versaoTermo: true,
            aceito: true,
            registradoEm: true,
            revogadoEm: true
          }
        }
      }
    });

    if (!usuario) {
      res.status(404).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado.'
      });
      return;
    }

    res.json({
      sucesso: true,
      usuario
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar perfil do usuário.'
    });
  }
});

authRoutes.patch('/preferences', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const validacao = PreferenciasSensoriaisSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  try {
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: req.usuario!.id },
      data: validacao.data,
      select: {
        id: true,
        nome: true,
        email: true,
        temaPreferido: true,
        tamanhoFonte: true,
        reduzirMovimento: true,
        atualizadoEm: true
      }
    });

    res.json({
      sucesso: true,
      mensagem: 'Preferências sensoriais atualizadas com sucesso.',
      usuario: usuarioAtualizado
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao atualizar preferências.'
    });
  }
});
