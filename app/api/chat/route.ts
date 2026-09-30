import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { procesarMensaje, ErrorConversacion } from "../../../src/core/motorConversacion";

export const maxDuration = 60;

function claveValida(recibida: string | null): boolean {
  const esperada = process.env.SHYRPANI_API_KEY;
  if (!esperada || !recibida) return false;

  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!claveValida(req.headers.get("x-api-key"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { usuarioId, conversacionId, contenido } = body;

  if (!usuarioId || !conversacionId || !contenido) {
    return NextResponse.json(
      { error: "Faltan campos: usuarioId, conversacionId, contenido" },
      { status: 400 }
    );
  }

  try {
    const resultado = await procesarMensaje({ usuarioId, conversacionId, contenido });
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof ErrorConversacion) {
      return NextResponse.json({ error: error.message }, { status: error.codigoHttp });
    }
    console.error("Error procesando mensaje:", error);
    return NextResponse.json({ error: "Error interno procesando el mensaje" }, { status: 500 });
  }
}