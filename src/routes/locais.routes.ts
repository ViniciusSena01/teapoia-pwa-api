import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database/prisma.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const locaisRoutes = Router();

const NovoLocalCalmoSchema = z.object({
  nome: z.string().trim().min(3, 'O nome do local deve ter pelo menos 3 caracteres').max(120),
  categoria: z.string().trim().min(2).max(60),
  nivelRuido: z.enum(['Silencioso', 'Baixo', 'Moderado', 'Não informado']).default('Não informado'),
  iluminacao: z.string().trim().max(80).default('Não informado'),
  descricao: z.string().trim().min(10, 'Descreva brevemente as características sensoriais do local').max(1000),
  possuiDescompressao: z.boolean().optional().default(false),
  endereco: z.string().trim().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  fonteDados: z.string().trim().max(120).optional().default('Colaboração Comunitária TEApoia')
});

function anexarLinkExternoMapa(local: {
  id: string;
  nome: string;
  categoria: string;
  nivelRuido: string;
  iluminacao: string;
  descricao: string;
  possuiDescompressao: boolean;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  fonteDados: string;
  criadoEm: Date;
  atualizadoEm: Date;
}) {
  const queryMapa =
    local.latitude !== null && local.longitude !== null
      ? `${local.latitude},${local.longitude}`
      : encodeURIComponent(`${local.nome} ${local.endereco || ''}`.trim());

  return {
    ...local,
    criadoEm: local.criadoEm.toISOString(),
    atualizadoEm: local.atualizadoEm.toISOString(),
    navegacaoExterna: {
      openStreetMapUrl:
        local.latitude !== null && local.longitude !== null
          ? `https://www.openstreetmap.org/?mlat=${local.latitude}&mlon=${local.longitude}#map=16/${local.latitude}/${local.longitude}`
          : `https://www.openstreetmap.org/search?query=${queryMapa}`,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${queryMapa}`,
      avisoPrivacidade:
        'A abertura do mapa externo ocorre somente após clique do usuário. A geolocalização do dispositivo nunca é coletada sem permissão explícita.'
    }
  };
}

// 1. LISTAR CATÁLOGO DE LOCAIS CALMOS COM FILTROS SENSORIAIS (TEA-24)
locaisRoutes.get('/', async (req: Request, res: Response): Promise<void> => {
  const categoria = typeof req.query.categoria === 'string' ? req.query.categoria.trim() : undefined;
  const nivelRuido = typeof req.query.nivelRuido === 'string' ? req.query.nivelRuido.trim() : undefined;
  const possuiDescompressao =
    req.query.possuiDescompressao === 'true'
      ? true
      : req.query.possuiDescompressao === 'false'
        ? false
        : undefined;
  const busca = typeof req.query.busca === 'string' ? req.query.busca.trim() : undefined;

  try {
    const locais = await prisma.localCalmo.findMany({
      where: {
        ...(categoria && { categoria: { contains: categoria } }),
        ...(nivelRuido && { nivelRuido: { contains: nivelRuido } }),
        ...(possuiDescompressao !== undefined && { possuiDescompressao }),
        ...(busca && {
          OR: [
            { nome: { contains: busca } },
            { descricao: { contains: busca } },
            { endereco: { contains: busca } }
          ]
        })
      },
      orderBy: { nome: 'asc' }
    });

    res.json({
      sucesso: true,
      total: locais.length,
      avisoTransparencia:
        'Cada local indica explicitamente sua fonte de dados e data da última atualização. Atributos não verificados são exibidos como "Não informado".',
      dados: locais.map(anexarLinkExternoMapa)
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao consultar o catálogo de locais calmos.'
    });
  }
});

// 2. CADASTRAR NOVO LOCAL CALMO NO CATÁLOGO (Autenticado — TEA-24)
locaisRoutes.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const validacao = NovoLocalCalmoSchema.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
    return;
  }

  try {
    const novoLocal = await prisma.localCalmo.create({
      data: validacao.data
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Local calmo cadastrado no catálogo com sucesso!',
      dado: anexarLinkExternoMapa(novoLocal)
    });
  } catch {
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao cadastrar local calmo.'
    });
  }
});
