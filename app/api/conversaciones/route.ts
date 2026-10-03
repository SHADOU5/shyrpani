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

  const conversaciones = await prisma.conversacion.findMany({
    where: { usuarioId },
    orderBy: { creadoEn: "desc" },
    select: { id: true, titulo: true, creadoEn: true },
  });

  return NextResponse.json({ conversaciones });
}

export async function POST(req: NextRequest) {
  const noAutorizado = exigirClave(req);
  if (noAutorizado) return noAutorizado;

  const { usuarioId } = await req.json();
  if (!usuarioId) {
    return NextResponse.json({ error: "Falta usuarioId" }, { status: 400 });
  }

  const conversacion = await prisma.conversacion.create({ data: { usuarioId } });
  return NextResponse.json({ conversacionId: conversacion.id });
}