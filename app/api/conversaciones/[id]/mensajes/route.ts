import { NextRequest, NextResponse } from "next/server";
import { exigirClave } from "../../../../../src/core/autenticacion";
import { prisma } from "../../../../../src/db/cliente";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const noAutorizado = exigirClave(req);
  if (noAutorizado) return noAutorizado;

  const { id } = await params;

  const mensajes = await prisma.mensaje.findMany({
    where: { conversacionId: id },
    orderBy: { creadoEn: "asc" },
    select: { id: true, rol: true, contenido: true, creadoEn: true },
  });

  return NextResponse.json({ mensajes });
}