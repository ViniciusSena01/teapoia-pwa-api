import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database/prisma.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const contatosRoutes = Router();

const ContatoApoioSchema = z.object({
  nome: z.string().trim().min(2, 'O nome do contato deve ter pelo menos 2 caracteres').max(100),
  telefone: z
    .string()
    .trim()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length >= 10 && val.length <= 15, {
      message: 'Informe um número de telefone válido com DDD (ex: 11999999999 ou 5511999999999)'
    }),
  parentesco: z.string().trim().max(50).optional(),
  mensagemPadrao: z
    .string()
    .trim()
    .min(5, 'A mensagem padrão deve ter pelo menos 5 caracteres')
    .max(500)
    .optional()
    .default('Olá, estou em sobrecarga sensorial e preciso de apoio.')
});

const AtualizarContatoSchema = z.object({
  nome: z.string().trim().min(2).max(100).optional(),
  telefone: z
    .string()
    .trim()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length >= 10 && val.length <= 15, {
      message: 'Informe um número de telefone válido com DDD'
    })
    .optional(),
  parentesco: z.string().trim().max(50).optional(),
  mensagemPadrao: z.string().trim().min(5).max(500).optional()
});

function gerarLinksAcionamento(telefone: string, mensagemPadrao: string) {
  const foneComPais = telefone.startsWith('55') && telefone.length >= 12 ? telefone : `55${telefone}`;
  const msgEncoded = encodeURIComponent(mensagemPadrao);
  return {
    deepLinkTelefone: `tel:+${foneComPais}`,
    deepLinkWhatsApp: `https://wa.me/${foneComPais}?text=${msgEncoded}`,
    avisoAcionamento:
      'Estes links abrem o aplicativo externo (Telefone ou WhatsApp). O envio final depende da confirmação do usuário no aplicativo aberto.'
  };
}

// 1. CANAIS PÚBLICOS DE APOIO E EMERGÊNCIA (Disponível sem login — TEA-15)
contatosRoutes.get('/emergencia-publica', (_req: Request, res: Response): void => {
  res.json({
    sucesso: true,
    avisoLegal:
      'As ferramentas do TEApoia são recursos complementares de autorregulação e não substituem atendimento médico, psicológico ou serviços públicos de emergência.',
    canaisOficiais: [
      {
        id: 'cvv-188',
        nome: 'CVV — Centro de Valorização da Vida',
        telefone: '188',
        deepLink: 'tel:188',
        funcionamento: '24 horas, ligação gratuita em todo o Brasil',
        descricao: 'Apoio emocional e prevenção do suicídio sob total sigilo.'
      },
      {
        id: 'samu-192',
        nome: 'SAMU — Serviço de Atendimento Móvel de Urgência',
        telefone: '192',
        deepLink: 'tel:192',
        funcionamento: '24 horas, ligação gratuita',
        descricao: 'Atendimento de urgência e emergência médica.'
      },
      {
        id: 'bombeiros-193',
        nome: 'Corpo de Bombeiros',
        telefone: '193',
        deepLink: 'tel:193',
        funcionamento: '24 horas, ligação gratuita',
        descricao: 'Socorro e resgate em situações de risco físico.'
      }
    ]
  });
});

// 2. LISTAR CONTATOS DE CONFIANÇA DO USUÁRIO LOGADO (TEA-15)
contatosRoutes.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const usuarioId = req.usuario!.id;

  try {
    const contatos = await prisma.contatoApoio.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: 'asc' }
    });

    const dados = contatos.map((c) => ({
      ...c,
      acionamento: gerarLinksAcionamento(c.telefone, c.mensagemPadrao)
    }));

    res.json({
      sucesso: true,
      total: dados.length,
      dados
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao listar contatos de confiança.'
    });
  }
});

// 3. CADASTRAR NOVO CONTATO DE CONFIANÇA (TEA-15)
contatosRoutes.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const validacao = ContatoApoioSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  const usuarioId = req.usuario!.id;
  const { nome, telefone, parentesco, mensagemPadrao } = validacao.data;

  try {
    const totalExistentes = await prisma.contatoApoio.count({ where: { usuarioId } });
    if (totalExistentes >= 10) {
      res.status(400).json({
        sucesso: false,
        mensagem: 'Limite máximo de 10 contatos de confiança atingido.'
      });
      return;
    }

    const novoContato = await prisma.contatoApoio.create({
      data: {
        usuarioId,
        nome,
        telefone,
        parentesco: parentesco ?? null,
        mensagemPadrao
      }
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Contato de confiança cadastrado com sucesso!',
      dado: {
        ...novoContato,
        acionamento: gerarLinksAcionamento(novoContato.telefone, novoContato.mensagemPadrao)
      }
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao cadastrar contato de confiança.'
    });
  }
});

// 4. EDITAR CONTATO DE CONFIANÇA DO PRÓPRIO USUÁRIO (TEA-15)
contatosRoutes.put('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const validacao = AtualizarContatoSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  const usuarioId = req.usuario!.id;
  const id = String(req.params.id);

  try {
    const existente = await prisma.contatoApoio.findFirst({
      where: { id, usuarioId }
    });

    if (!existente) {
      res.status(404).json({
        sucesso: false,
        mensagem: 'Contato não encontrado ou não pertence a este usuário.'
      });
      return;
    }

    const atualizado = await prisma.contatoApoio.update({
      where: { id: existente.id },
      data: validacao.data
    });

    res.json({
      sucesso: true,
      mensagem: 'Contato atualizado com sucesso.',
      dado: {
        ...atualizado,
        acionamento: gerarLinksAcionamento(atualizado.telefone, atualizado.mensagemPadrao)
      }
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao atualizar contato de confiança.'
    });
  }
});

// 5. REMOVER CONTATO DE CONFIANÇA DO PRÓPRIO USUÁRIO (TEA-15)
contatosRoutes.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const usuarioId = req.usuario!.id;
  const id = String(req.params.id);

  try {
    const existente = await prisma.contatoApoio.findFirst({
      where: { id, usuarioId }
    });

    if (!existente) {
      res.status(404).json({
        sucesso: false,
        mensagem: 'Contato não encontrado ou não pertence a este usuário.'
      });
      return;
    }

    await prisma.contatoApoio.delete({
      where: { id: existente.id }
    });

    res.json({
      sucesso: true,
      mensagem: 'Contato de confiança removido com sucesso.'
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao remover contato de confiança.'
    });
  }
});
