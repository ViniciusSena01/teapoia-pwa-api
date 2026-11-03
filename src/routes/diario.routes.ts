import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export const diarioRoutes = Router();

// Schema de validação para registro de diário sensorial
const RegistroDiarioSchema = z.object({
  humor: z.string().min(1, 'Humor é obrigatório'),
  nivelSobrecarga: z.number().min(1).max(5),
  gatilhos: z.array(z.string()).optional(),
  relato: z.string().optional(),
  criadoEm: z.string().optional()
});

export type RegistroDiario = z.infer<typeof RegistroDiarioSchema> & {
  id: string;
};

// Armazenamento inicial em memória (será conectado ao banco)
const registrosMock: RegistroDiario[] = [];

diarioRoutes.get('/', (_req: Request, res: Response) => {
  res.json({
    sucesso: true,
    total: registrosMock.length,
    dados: registrosMock
  });
});

diarioRoutes.post('/', (req: Request, res: Response) => {
  const validacao = RegistroDiarioSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      sucesso: false,
      erros: validacao.error.flatten().fieldErrors
    });
  }

  const novoRegistro: RegistroDiario = {
    id: randomUUID(),
    ...validacao.data,
    criadoEm: validacao.data.criadoEm || new Date().toISOString()
  };

  registrosMock.push(novoRegistro);

  return res.status(201).json({
    sucesso: true,
    mensagem: 'Registro do diário salvo com sucesso!',
    dado: novoRegistro
  });
});

