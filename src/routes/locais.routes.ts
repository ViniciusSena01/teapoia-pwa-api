import { Router, Request, Response } from 'express';

export const locaisRoutes = Router();

// Catálogo de locais tranquilos para autorregulação
const locaisCalmos = [
  {
    id: '1',
    nome: 'Parque Ecológico Municipal',
    categoria: 'Natureza / Área Aberta',
    nivelRuido: 'Baixo',
    iluminacao: 'Natural suave',
    descricao: 'Área com bosques sombreados, bancos afastados e pouca movimentação durante dias de semana.',
    possuiSalaDescompressao: false
  },
  {
    id: '2',
    nome: 'Biblioteca Pública Central',
    categoria: 'Espaço de Leitura / Estudo',
    nivelRuido: 'Silencioso',
    iluminacao: 'Indireta acolhedora',
    descricao: 'Ambiente climatizado, silêncio obrigatório e poltronas confortáveis para autorregulação.',
    possuiSalaDescompressao: true
  },
  {
    id: '3',
    nome: 'Jardim Botânico',
    categoria: 'Área Verde / Contemplação',
    nivelRuido: 'Muito baixo',
    iluminacao: 'Luz natural',
    descricao: 'Espaço com trilhas calmas, sons de água corrente e pouquíssimos estímulos sonoros artificiais.',
    possuiSalaDescompressao: false
  }
];

locaisRoutes.get('/', (_req: Request, res: Response) => {
  res.json({
    sucesso: true,
    total: locaisCalmos.length,
    dados: locaisCalmos
  });
});

