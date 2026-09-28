import { NextRequest, NextResponse } from "next/server";
import { procesarMensaje, ErrorConversacion } from "../../../src/core/motorConversacion";

export async function POST(req: NextRequest) {
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