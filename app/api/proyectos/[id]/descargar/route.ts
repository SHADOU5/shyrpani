import { NextRequest, NextResponse } from "next/server";
import { zipSync, strToU8 } from "fflate";
import { exigirClave } from "../../../../../src/core/autenticacion";
import { prisma } from "../../../../../src/db/cliente";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const noAutorizado = exigirClave(req);
  if (noAutorizado) return noAutorizado;

  const { id } = await params;
  const usuarioId = req.nextUrl.searchParams.get("usuarioId");
  if (!usuarioId) {
    return NextResponse.json({ error: "Falta usuarioId" }, { status: 400 });
  }

  const proyecto = await prisma.proyectoCodigo.findFirst({
    where: { id, usuarioId },
    include: { archivos: true },
  });

  if (!proyecto || proyecto.archivos.length === 0) {
    return NextResponse.json({ error: "Proyecto no encontrado o vacío" }, { status: 404 });
  }

  const carpeta =
    proyecto.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "proyecto";

  const entradas: Record<string, Uint8Array> = {};
  for (const a of proyecto.archivos) {
    entradas[`${carpeta}/${a.ruta}`] = strToU8(a.contenido);
  }

  const zip = zipSync(entradas);

  return new NextResponse(zip as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${carpeta}.zip"`,
    },
  });
}