import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados TEApoia...');

  const locaisIniciais = [
    {
      id: 'local-calmo-01',
      nome: 'Biblioteca Pública Central — Setor de Leitura Silenciosa',
      categoria: 'Biblioteca',
      nivelRuido: 'Silencioso',
      iluminacao: 'Indireta e controlada',
      descricao: 'Salão amplo com isolamento acústico, cabines individuais e ausência de sinais sonoros altos.',
      possuiDescompressao: true,
      endereco: 'Setor Cultural Central',
      fonteDados: 'Curadoria Inicial TEApoia (TCC 2026)'
    },
    {
      id: 'local-calmo-02',
      nome: 'Parque Ecológico — Trilha dos Bosques Sombreados',
      categoria: 'Parque / Natureza',
      nivelRuido: 'Baixo',
      iluminacao: 'Natural suave (sombra de árvores)',
      descricao: 'Área arborizada afastada de vias principais, com bancos espaçados e baixa circulação em dias úteis.',
      possuiDescompressao: false,
      endereco: 'Avenida Parque Verde, Portão 2',
      fonteDados: 'Curadoria Inicial TEApoia (TCC 2026)'
    },
    {
      id: 'local-calmo-03',
      nome: 'Centro Cultural — Sala de Acolhimento Sensorial',
      categoria: 'Sala Sensorial',
      nivelRuido: 'Silencioso',
      iluminacao: 'Controlada (dimerizável)',
      descricao: 'Espaço dedicado à autorregulação sensorial com abafadores disponíveis, iluminação quente e poltronas confortáveis.',
      possuiDescompressao: true,
      endereco: 'Praça das Artes, Piso Térreo',
      fonteDados: 'Curadoria Inicial TEApoia (TCC 2026)'
    },
    {
      id: 'local-calmo-04',
      nome: 'Jardim Botânico — Recanto de Contemplação',
      categoria: 'Parque / Natureza',
      nivelRuido: 'Baixo',
      iluminacao: 'Natural suave',
      descricao: 'Jardim sensorial com fontes de água de fluxo contínuo e trilhas planas de fácil acesso.',
      possuiDescompressao: false,
      endereco: 'Alameda Botânica, Setor Sul',
      fonteDados: 'Curadoria Inicial TEApoia (TCC 2026)'
    }
  ];

  for (const local of locaisIniciais) {
    await prisma.localCalmo.upsert({
      where: { id: local.id },
      update: local,
      create: local
    });
  }

  console.log(`✅ Seed concluído: ${locaisIniciais.length} locais calmos garantidos no banco.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
