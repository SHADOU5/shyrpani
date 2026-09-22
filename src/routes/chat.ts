import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { registroSkills } from "../core/skillRegistry";

const prisma = new PrismaClient();
export const rutaChat = Router();

rutaChat.post("/mensajes", async (req, res) => {
  const { usuarioId, conversacionId, contenido, skill: nombreSkill, entradaSkill } = req.body;

  if (!usuarioId || !conversacionId || !contenido) {
    return res.status(400).json({ error: "Faltan campos: usuarioId, conversacionId, contenido" });
  }

  const mensaje = await prisma.mensaje.create({
    data: { conversacionId, rol: "usuario", contenido },
  });

  let resultadoSkill = null;

  if (nombreSkill) {
    const skill = registroSkills.obtener(nombreSkill);

    if (!skill) {
      return res.status(404).json({ error: `Skill "${nombreSkill}" no encontrada` });
    }

    const resultado = await skill.ejecutar(entradaSkill, {
      usuarioId,
      conversacionId,
      mensajeId: mensaje.id,
    });

    resultadoSkill = await prisma.ejecucionHabilidad.create({
      data: {
        mensajeId: mensaje.id,
        nombreHabilidad: nombreSkill,
        entrada: entradaSkill ?? {},
        salida: resultado.salida as any,
        exitoso: resultado.exitoso,
      },
    });
  }

  res.json({ mensaje, resultadoSkill });
});