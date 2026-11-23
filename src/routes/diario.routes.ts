import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database/prisma.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const diarioRoutes = Router();

diarioRoutes.use(requireAuth);

const RegistroDiarioInputSchema = z.object({
  clientId: z.string().trim().min(1).max(100).optional(),
  humor: z.string().trim().min(1, 'O estado de humor é obrigatório').max(50),
  nivelSobrecarga: z
    .number()
    .int()
    .min(1, 'O nível mínimo de sobrecarga é 1')
    .max(5, 'O nível máximo de sobrecarga é 5'),
  gatilhos: z.array(z.string().trim().max(60)).max(20).optional().default([]),
  relato: z.string().trim().max(2000, 'O relato deve ter no máximo 2000 caracteres').optional(),
  criadoEm: z.string().datetime().optional(),
  atualizadoEm: z.string().datetime().optional()
});

const AtualizarDiarioSchema = z.object({
  humor: z.string().trim().min(1).max(50).optional(),
  nivelSobrecarga: z.number().int().min(1).max(5).optional(),
  gatilhos: z.array(z.string().trim().max(60)).max(20).optional(),
  relato: z.string().trim().max(2000).nullable().optional()
});

const SincronizacaoLoteSchema = z.object({
  registros: z
    .array(
      RegistroDiarioInputSchema.extend({
        clientId: z.string().trim().min(1, 'clientId é obrigatório para sincronização idempotente')
      })
    )
    .min(1, 'Envie pelo menos 1 registro para sincronizar')
    .max(100, 'Limite máximo de 100 registros por lote de sincronização')
});

function formatarRegistro(reg: {
  id: string;
  clientId: string | null;
  humor: string;
  nivelSobrecarga: number;
  gatilhos: string | null;
  relato: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
  sincronizadoEm: Date;
}) {
  let gatilhosParsed: string[] = [];
  if (reg.gatilhos) {
    try {
      gatilhosParsed = JSON.parse(reg.gatilhos);
    } catch {
      gatilhosParsed = reg.gatilhos.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  return {
    id: reg.id,
    clientId: reg.clientId,
    humor: reg.humor,
    nivelSobrecarga: reg.nivelSobrecarga,
    gatilhos: gatilhosParsed,
    relato: reg.relato,
    criadoEm: reg.criadoEm.toISOString(),
    atualizadoEm: reg.atualizadoEm.toISOString(),
    sincronizadoEm: reg.sincronizadoEm.toISOString()
  };
}

// 1. LISTAR REGISTROS DO PRÓPRIO USUÁRIO COM PAGINAÇÃO E FILTROS (TEA-20)
diarioRoutes.get('/', async (req: Request, res: Response): Promise<void> => {
  const usuarioId = req.usuario!.id;
  const limite = Math.min(Math.max(Number(req.query.limite) || 50, 1), 100);
  const pagina = Math.max(Number(req.query.pagina) || 1, 1);
  const humorFiltro = typeof req.query.humor === 'string' ? req.query.humor.trim() : undefined;

  try {
    const whereClause = {
      usuarioId,
      ...(humorFiltro && { humor: humorFiltro })
    };

    const [total, registros] = await Promise.all([
      prisma.registroDiario.count({ where: whereClause }),
      prisma.registroDiario.findMany({
        where: whereClause,
        orderBy: { criadoEm: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite
      })
    ]);

    res.json({
      sucesso: true,
      paginacao: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite) || 1
      },
      dados: registros.map(formatarRegistro)
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao consultar registros do diário.'
    });
  }
});

// 2. CRIAR REGISTRO NO DIÁRIO (COM SUPORTE IDEMPOTENTE A CLIENT_ID) (TEA-20)
diarioRoutes.post('/', async (req: Request, res: Response): Promise<void> => {
  const validacao = RegistroDiarioInputSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  const usuarioId = req.usuario!.id;
  const { clientId, humor, nivelSobrecarga, gatilhos, relato, criadoEm } = validacao.data;
  const gatilhosJson = JSON.stringify(gatilhos || []);

  try {
    if (clientId) {
      const registro = await prisma.registroDiario.upsert({
        where: {
          usuarioId_clientId: {
            usuarioId,
            clientId
          }
        },
        update: {
          humor,
          nivelSobrecarga,
          gatilhos: gatilhosJson,
          relato: relato ?? null,
          sincronizadoEm: new Date()
        },
        create: {
          usuarioId,
          clientId,
          humor,
          nivelSobrecarga,
          gatilhos: gatilhosJson,
          relato: relato ?? null,
          ...(criadoEm && { criadoEm: new Date(criadoEm) })
        }
      });

      res.status(201).json({
        sucesso: true,
        mensagem: 'Registro do diário salvo e sincronizado com sucesso!',
        dado: formatarRegistro(registro)
      });
      return;
    }

    const novoRegistro = await prisma.registroDiario.create({
      data: {
        usuarioId,
        humor,
        nivelSobrecarga,
        gatilhos: gatilhosJson,
        relato: relato ?? null,
        ...(criadoEm && { criadoEm: new Date(criadoEm) })
      }
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Registro do diário salvo com sucesso!',
      dado: formatarRegistro(novoRegistro)
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao salvar registro do diário.'
    });
  }
});

// 3. SINCRONIZAÇÃO EM LOTE LOCAL-FIRST & RESOLUÇÃO DE CONFLITOS (TEA-21)
diarioRoutes.post('/sync', async (req: Request, res: Response): Promise<void> => {
  const validacao = SincronizacaoLoteSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  const usuarioId = req.usuario!.id;
  const { registros } = validacao.data;

  try {
    const resultados = [];
    let criados = 0;
    let atualizados = 0;
    let mantidosServidor = 0;

    for (const item of registros) {
      const existente = await prisma.registroDiario.findUnique({
        where: {
          usuarioId_clientId: {
            usuarioId,
            clientId: item.clientId
          }
        }
      });

      const gatilhosJson = JSON.stringify(item.gatilhos || []);

      if (!existente) {
        const criado = await prisma.registroDiario.create({
          data: {
            usuarioId,
            clientId: item.clientId,
            humor: item.humor,
            nivelSobrecarga: item.nivelSobrecarga,
            gatilhos: gatilhosJson,
            relato: item.relato ?? null,
            ...(item.criadoEm && { criadoEm: new Date(item.criadoEm) })
          }
        });
        criados += 1;
        resultados.push({ statusSync: 'criado', registro: formatarRegistro(criado) });
      } else {
        const dataCliente = item.atualizadoEm ? new Date(item.atualizadoEm) : new Date();
        if (dataCliente >= existente.atualizadoEm) {
          const atualizado = await prisma.registroDiario.update({
            where: { id: existente.id },
            data: {
              humor: item.humor,
              nivelSobrecarga: item.nivelSobrecarga,
              gatilhos: gatilhosJson,
              relato: item.relato ?? null,
              sincronizadoEm: new Date()
            }
          });
          atualizados += 1;
          resultados.push({ statusSync: 'atualizado', registro: formatarRegistro(atualizado) });
        } else {
          mantidosServidor += 1;
          resultados.push({
            statusSync: 'mantido_versao_mais_recente_servidor',
            registro: formatarRegistro(existente)
          });
        }
      }
    }

    res.json({
      sucesso: true,
      mensagem: 'Sincronização concluída com sucesso.',
      resumo: {
        totalProcessados: registros.length,
        criados,
        atualizados,
        mantidosServidor
      },
      resultados
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro durante a sincronização de registros.'
    });
  }
});

// 4. EDITAR REGISTRO DO PRÓPRIO USUÁRIO (TEA-18, TEA-20)
diarioRoutes.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const validacao = AtualizarDiarioSchema.safeParse(req.body);

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
    const existente = await prisma.registroDiario.findFirst({
      where: { id, usuarioId }
    });

    if (!existente) {
      res.status(404).json({
        sucesso: false,
        mensagem: 'Registro não encontrado ou não pertence a este usuário.'
      });
      return;
    }

    const { humor, nivelSobrecarga, gatilhos, relato } = validacao.data;

    const atualizado = await prisma.registroDiario.update({
      where: { id: existente.id },
      data: {
        ...(humor !== undefined && { humor }),
        ...(nivelSobrecarga !== undefined && { nivelSobrecarga }),
        ...(gatilhos !== undefined && { gatilhos: JSON.stringify(gatilhos) }),
        ...(relato !== undefined && { relato }),
        sincronizadoEm: new Date()
      }
    });

    res.json({
      sucesso: true,
      mensagem: 'Registro atualizado com sucesso.',
      dado: formatarRegistro(atualizado)
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao atualizar registro do diário.'
    });
  }
});

// 5. EXCLUIR REGISTRO DO PRÓPRIO USUÁRIO (TEA-20, TEA-22)
diarioRoutes.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const usuarioId = req.usuario!.id;
  const id = String(req.params.id);

  try {
    const existente = await prisma.registroDiario.findFirst({
      where: { id, usuarioId }
    });

    if (!existente) {
      res.status(404).json({
        sucesso: false,
        mensagem: 'Registro não encontrado ou não pertence a este usuário.'
      });
      return;
    }

    await prisma.registroDiario.delete({
      where: { id: existente.id }
    });

    res.json({
      sucesso: true,
      mensagem: 'Registro excluído permanentemente com sucesso.'
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao excluir registro do diário.'
    });
  }
});
