-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
