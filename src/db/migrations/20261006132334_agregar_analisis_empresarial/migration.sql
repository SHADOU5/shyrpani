-- CreateTable
CREATE TABLE "AnalisisEmpresarial" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalisisEmpresarial_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AnalisisEmpresarial" ADD CONSTRAINT "AnalisisEmpresarial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
