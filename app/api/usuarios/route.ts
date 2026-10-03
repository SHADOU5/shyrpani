import { NextRequest, NextResponse } from "next/server";
import { exigirClave } from "../../../src/core/autenticacion";
import { prisma } from "../../../src/db/cliente";

export async function POST(req: NextRequest) {
  const noAutorizado = exigirClave(req);
  if (noAutorizado) return noAutorizado;

  const id = crypto.randomUUID();
  const usuario = await prisma.usuario.create({
    data: { email: `anon-${id}@shyrpani.local`, nombre: "Invitado" },
  });

  return NextResponse.json({ usuarioId: usuario.id });
}