# TEApoia REST API (`teapoia-pwa-api`)
**Backend Oficial do Projeto TEApoia — Trabalho de Conclusão de Curso (Análise e Desenvolvimento de Sistemas)**

API RESTful desenvolvida em **Node.js 22 + Express + TypeScript + Prisma ORM + Zod**, projetada para dar suporte à arquitetura **Local-First (Offline-First)** do aplicativo PWA **TEApoia**, voltado à autorregulação sensorial, comunicação assistiva (CAA) e apoio a pessoas no espectro autista (TEA).

---

## 1. Arquitetura e Módulos Implementados (Rastreabilidade Jira)

| Épico / Tarefa | Módulo | Endpoints Principais | Descrição Técnica |
| :--- | :--- | :--- | :--- |
| **TEA-01 / TEA-03** | **Fundação & Banco Prisma** | `GET /api/health` | Modelagem relacional (`Usuario`, `Consentimento`, `RegistroDiario`, `ContatoApoio`, `LocalCalmo`), migrations reproduzíveis e seed inicial. |
| **TEA-04 a TEA-07** | **Autenticação & Segurança** | `POST /api/auth/register`<br>`POST /api/auth/login`<br>`POST /api/auth/confirm-email`<br>`POST /api/auth/forgot-password`<br>`POST /api/auth/reset-password` | Hash de senhas via `bcryptjs` (10 rounds), tokens de uso único com expiração, bloqueio temporário contra força bruta, rate limiting por IP e autenticação JWT. |
| **TEA-10 / TEA-16** | **Preferências Sensoriais** | `GET /api/auth/me`<br>`PATCH /api/auth/preferences` | Persistência das preferências de tema (`default`, `dark`, `reading`, `high-contrast`), tamanho de fonte e diretriz de redução de movimento (`reduzirMovimento`). |
| **TEA-11 a TEA-14** | **Modo Crise & CAA** | `GET /api/crise/protocolos` | Protocolos de sobrecarga sensorial (níveis 1 a 4), exercícios de respiração guiada (com alternativa estática) e cartões de Comunicação Aumentativa e Alternativa (CAA). |
| **TEA-15** | **Rede de Apoio & SOS** | `GET /api/contatos/emergencia-publica`<br>`GET / POST / PUT / DELETE /api/contatos` | CRUD de contatos de confiança exclusivos do usuário e geração de deep links (`tel:` e `https://wa.me/`) com aviso explícito de confirmação externa. |
| **TEA-18 a TEA-21** | **Diário & Sync Local-First** | `GET / POST / PUT / DELETE /api/diario`<br>`POST /api/diario/sync` | Sincronização idempotente via chave composta `@@unique([usuarioId, clientId])` e resolução de conflitos por timestamp (`atualizadoEm`), evitando duplicidades ou perda de edições offline. |
| **TEA-24** | **Catálogo de Locais Calmos** | `GET / POST /api/locais` | Busca filtrável por categoria, nível de ruído e sala de descompressão, com transparência da fonte dos dados (`fonteDados`) e links externos para OpenStreetMap/Google Maps. |
| **TEA-08, 09, 22, 23** | **Privacidade & LGPD** | `GET /api/lgpd/matriz-privacidade`<br>`POST /api/lgpd/consentimentos`<br>`GET /api/lgpd/exportar`<br>`DELETE /api/lgpd/excluir-conta` | Registro de consentimentos por finalidade e versão, ocultação de payloads sensíveis nos logs do servidor, exportação integral em JSON e exclusão definitiva em cascata (`onDelete: Cascade`). |

---

## 2. Como Executar Localmente

### Pré-requisitos
- **Node.js** `>= 20.x` (Recomendado `v22 LTS`)
- **NPM** `>= 10.x`

### Passo a Passo
```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente (caso o arquivo .env ainda não exista)
cp .env.example .env

# 3. Executar as migrations do Prisma (cria o banco SQLite local dev.db)
npx prisma migrate dev

# 4. Popular o catálogo inicial de Locais Calmos
npm run db:seed

# 5. Iniciar o servidor em modo de desenvolvimento
npm run dev
```

---

## 3. Painel Visual de Testes e Homologação

Com o servidor rodando (`npm run dev`), acesse no navegador:

- **Console Interativo de Testes (1 Clique):** `http://localhost:3333/teste`
- **Mapa Geral da API (JSON):** `http://localhost:3333/`
- **Painel Visual do Banco (Prisma Studio):** `npm run db:studio` (`http://localhost:5555`)
- **Coleção de Testes HTTP (VS Code REST Client):** Veja o arquivo `api-tests.http` na raiz do repositório.
