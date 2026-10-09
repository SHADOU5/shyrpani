-- CreateTable
CREATE TABLE "ProyectoCodigo" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "stack" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProyectoCodigo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivoProyecto" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivoProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArchivoProyecto_proyectoId_ruta_key" ON "ArchivoProyecto"("proyectoId", "ruta");

-- AddForeignKey
ALTER TABLE "ProyectoCodigo" ADD CONSTRAINT "ProyectoCodigo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivoProyecto" ADD CONSTRAINT "ArchivoProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoCodigo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
