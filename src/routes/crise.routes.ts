import { Router, Request, Response } from 'express';

export const criseRoutes = Router();

// -----------------------------------------------------------------------------
// PROTOCOLOS DE MODO CRISE, SOBRECARGA, RESPIRAÇÃO E CARTÕES CAA
// Referências: TEA-11, TEA-12, TEA-13, TEA-14 (Funciona para Visitante e Conta)
// -----------------------------------------------------------------------------
criseRoutes.get('/protocolos', (_req: Request, res: Response) => {
  return res.json({
    sucesso: true,
    avisoComplementar:
      'Estes recursos são informativos e voltados ao conforto sensorial imediato. O usuário mantém controle total sobre ativar ou encerrar qualquer ação, e nenhum conteúdo constitui diagnóstico ou tratamento médico.',
    estadosSobrecarga: [
      {
        nivel: 1,
        rotulo: 'Estou estável / tranquila(o)',
        corReferencia: 'verde',
        reducaoEstimulos: 'nenhuma',
        descricao: 'Conforto sensorial adequado. Todas as funcionalidades do aplicativo permanecem visíveis.',
        acoesRecomendadas: [
          { id: 'diario', titulo: 'Registrar como me sinto no Diário' },
          { id: 'locais', titulo: 'Explorar Locais Calmos' }
        ]
      },
      {
        nivel: 2,
        rotulo: 'Sentindo leve cansaço sensorial',
        corReferencia: 'amarelo',
        reducaoEstimulos: 'moderada',
        descricao: 'Primeiros sinais de fadiga por barulho, luz ou interação social prolongada.',
        acoesRecomendadas: [
          { id: 'tema-leitura', titulo: 'Ativar Tema de Leitura (Baixo Contraste / Sépia)' },
          { id: 'respiracao', titulo: 'Fazer 1 minuto de Respiração Guiada' },
          { id: 'pausa', titulo: 'Procurar um ambiente silencioso por 10 minutos' }
        ]
      },
      {
        nivel: 3,
        rotulo: 'Sobrecarregada(o) — Preciso desacelerar',
        corReferencia: 'laranja',
        reducaoEstimulos: 'alta',
        descricao: 'Dificuldade de processar múltiplos estímulos simultâneos. Recomenda-se ocultar menus secundários.',
        acoesRecomendadas: [
          { id: 'respiracao-4444', titulo: 'Iniciar Respiração Guiada (Ritmo 4-4-4-4)' },
          { id: 'caa-espaco', titulo: 'Mostrar Cartão de Voz: "Preciso de espaço"' },
          { id: 'stims', titulo: 'Realizar movimentos regulatórios (Stims) livremente' }
        ]
      },
      {
        nivel: 4,
        rotulo: 'Muito sobrecarregada(o) — Modo Crise / Foco Emergencial',
        corReferencia: 'vermelho-suave',
        reducaoEstimulos: 'maxima',
        descricao: 'Modo Crise ativo: oculta gráficos e menus secundários, exibindo apenas 3 ações diretas de acolhimento.',
        acoesRecomendadas: [
          { id: 'caa-emergencia', titulo: 'Usar Cartões de Comunicação com Voz (CAA)' },
          { id: 'respiracao-estatica', titulo: 'Respiração Guiada (Com opção sem animação)' },
          { id: 'acionar-apoio', titulo: 'Chamar Contato de Confiança ou CVV (188)' }
        ]
      }
    ],
    exerciciosRespiracao: [
      {
        id: 'quadrada-4-4-4-4',
        nome: 'Respiração em Caixa (4-4-4-4)',
        indicacao: 'Auxilia a estabilizar o ritmo respiratório de forma previsível.',
        etapas: [
          { fase: 'Inspirar pelo nariz', segundos: 4 },
          { fase: 'Segurar o ar com calma', segundos: 4 },
          { fase: 'Soltar o ar devagar pela boca', segundos: 4 },
          { fase: 'Pausa suave antes de recomeçar', segundos: 4 }
        ],
        alternativaSemAnimacao:
          'Modo Estático (prefers-reduced-motion): Acompanhe apenas o contador numérico de 1 a 4 em tela fixa, sem círculos em movimento.'
      },
      {
        id: 'calma-4-7-8',
        nome: 'Respiração Suave (4-7-8)',
        indicacao: 'Focada em prolongar a expiração para reduzir a tensão corporal.',
        etapas: [
          { fase: 'Inspirar suavemente', segundos: 4 },
          { fase: 'Manter o ar', segundos: 7 },
          { fase: 'Expirar lentamente', segundos: 8 }
        ],
        alternativaSemAnimacao:
          'Modo Estático (prefers-reduced-motion): Siga as instruções em texto fixo com contagem regressiva simples.'
      }
    ],
    cartoesCAA: [
      {
        id: 'caa-01',
        categoria: 'Urgência Sensorial',
        tituloCurto: 'Preciso sair daqui',
        textoFala: 'Estou tendo uma sobrecarga sensorial. Preciso ir para um lugar silencioso agora, por favor.',
        iconeSugerido: 'door-open'
      },
      {
        id: 'caa-02',
        categoria: 'Comunicação Não-Verbal',
        tituloCurto: 'Não consigo falar agora',
        textoFala: 'Eu sou autista e não consigo falar neste momento. Por favor, tenha paciência e fale devagar.',
        iconeSugerido: 'volume-x'
      },
      {
        id: 'caa-03',
        categoria: 'Espaço Pessoal',
        tituloCurto: 'Por favor, me dê espaço',
        textoFala: 'Por favor, não me toque e mantenha um pouco de distância. Eu só preciso de alguns minutos para me acalmar.',
        iconeSugerido: 'shield'
      },
      {
        id: 'caa-04',
        categoria: 'Necessidade Básica',
        tituloCurto: 'Preciso de água / sentar',
        textoFala: 'Você pode me ajudar a encontrar um lugar para sentar e um pouco de água, por favor?',
        iconeSugerido: 'droplet'
      },
      {
        id: 'caa-05',
        categoria: 'Rede de Apoio',
        tituloCurto: 'Ligue para meu contato',
        textoFala: 'Preciso que você me ajude a entrar em contato com uma pessoa de minha confiança.',
        iconeSugerido: 'phone-call'
      }
    ]
  });
});
