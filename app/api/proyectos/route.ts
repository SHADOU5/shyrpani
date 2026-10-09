import { NextRequest, NextResponse } from "next/server";
import { exigirClave } from "../../../src/core/autenticacion";
import { prisma } from "../../../src/db/cliente";

export async function GET(req: NextRequest) {
  const noAutorizado = exigirClave(req);
  if (noAutorizado) return noAutorizado;

  const usuarioId = req.nextUrl.searchParams.get("usuarioId");
  if (!usuarioId) {
    return NextResponse.json({ error: "Falta usuarioId" }, { status: 400 });
  }

  const proyectos = await prisma.proyectoCodigo.findMany({
    where: { usuarioId, archivos: { some: {} } },
    orderBy: { creadoEn: "desc" },
    select: {
      id: true,
      nombre: true,
      stack: true,
      creadoEn: true,
      _count: { select: { archivos: true } },
    },
  });

  return NextResponse.json({ proyectos });
}