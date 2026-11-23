-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "emailConfirmado" BOOLEAN NOT NULL DEFAULT false,
    "tokenConfirmacao" TEXT,
    "tokenConfirmacaoExpira" DATETIME,
    "tokenRecuperacao" TEXT,
    "tokenRecuperacaoExpira" DATETIME,
    "tentativasRecuperacao" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" DATETIME,
    "temaPreferido" TEXT NOT NULL DEFAULT 'default',
    "tamanhoFonte" TEXT NOT NULL DEFAULT 'normal',
    "reduzirMovimento" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "consentimentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "finalidade" TEXT NOT NULL,
    "versaoTermo" TEXT NOT NULL,
    "aceito" BOOLEAN NOT NULL DEFAULT true,
    "registradoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogadoEm" DATETIME,
    "usuarioId" TEXT NOT NULL,
    CONSTRAINT "consentimentos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "registros_diario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "humor" TEXT NOT NULL,
    "nivelSobrecarga" INTEGER NOT NULL,
    "gatilhos" TEXT,
    "relato" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    "sincronizadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    CONSTRAINT "registros_diario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contatos_apoio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "parentesco" TEXT,
    "mensagemPadrao" TEXT NOT NULL DEFAULT 'Olá, estou em sobrecarga sensorial e preciso de apoio.',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    "usuarioId" TEXT NOT NULL,
    CONSTRAINT "contatos_apoio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "locais_calmos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nivelRuido" TEXT NOT NULL,
    "iluminacao" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "possuiDescompressao" BOOLEAN NOT NULL DEFAULT false,
    "endereco" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "fonteDados" TEXT NOT NULL DEFAULT 'Curadoria Inicial TEApoia (TCC)',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "consentimentos_usuarioId_finalidade_idx" ON "consentimentos"("usuarioId", "finalidade");

-- CreateIndex
CREATE INDEX "registros_diario_usuarioId_criadoEm_idx" ON "registros_diario"("usuarioId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "registros_diario_usuarioId_clientId_key" ON "registros_diario"("usuarioId", "clientId");

-- CreateIndex
CREATE INDEX "contatos_apoio_usuarioId_idx" ON "contatos_apoio"("usuarioId");

-- CreateIndex
CREATE INDEX "locais_calmos_categoria_idx" ON "locais_calmos"("categoria");
