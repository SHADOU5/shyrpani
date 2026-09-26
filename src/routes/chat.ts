import { Router } from "express";
import { procesarMensaje } from "../core/motorConversacion";

export const rutaChat = Router();

rutaChat.post("/mensajes", async (req, res) => {
  const { usuarioId, conversacionId, contenido } = req.body;

  if (!usuarioId || !conversacionId || !contenido) {
    return res.status(400).json({ error: "Faltan campos: usuarioId, conversacionId, contenido" });
  }

  try {
    const resultado = await procesarMensaje({ usuarioId, conversacionId, contenido });
    res.json(resultado);
  } catch (error) {
    console.error("Error procesando mensaje:", error);
    res.status(500).json({ error: "Error interno procesando el mensaje" });
  }
});