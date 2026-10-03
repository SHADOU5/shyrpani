import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export function claveValida(recibida: string | null): boolean {
  const esperada = process.env.SHYRPANI_API_KEY;
  if (!esperada || !recibida) return false;

  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export function exigirClave(req: NextRequest): NextResponse | null {
  if (!claveValida(req.headers.get("x-api-key"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}