import Groq from "groq-sdk";
import { PrismaClient } from "@prisma/client";
import { registroSkills } from "./skillRegistry";
import { ContextoSkill } from "./types";

const prisma = new PrismaClient();
const groq = new Groq(); // lee GROQ_API_KEY del entorno automáticamente

const MODELO = "openai/gpt-oss-20b";

const PROMPT_SISTEMA =
  "Eres Shyrpani, un asistente personal estilo Jarvis. Responde en español, de forma clara y directa. Usa las herramientas disponibles solo cuando realmente lo necesites para responder al usuario.";

function construirHerramientas() {
  return registroSkills.listar().map((skill) => ({
    type: "function" as const,
    function: {
      name: skill.nombre,
      description: skill.descripcion,
      parameters: skill.esquemaEntrada,
    },
  }));
}

export async function procesarMensaje(params: {
  usuarioId: string;
  conversacionId: string;
  contenido: string;
}) {
  const { usuarioId, conversacionId, contenido } = params;

  // 1. Guarda el mensaje del usuario
  const mensajeUsuario = await prisma.mensaje.create({
    data: { conversacionId, rol: "usuario", contenido },
  });

  // 2. Trae el historial de la conversación
  const historialDesc = await prisma.mensaje.findMany({
    where: { conversacionId },
    orderBy: { creadoEn: "desc" },
    take: 20,
  });
  const historial = historialDesc.reverse(); // vuelve a orden cronológico (más antiguo -> más nuevo)

  const mensajes: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: PROMPT_SISTEMA },
    ...historial.map((m): Groq.Chat.ChatCompletionMessageParam => ({
      role: m.rol === "asistente" ? "assistant" : "user",
      content: m.contenido,
    })),
  ];

  const herramientas = construirHerramientas();
  const contexto: ContextoSkill = { usuarioId, conversacionId, mensajeId: mensajeUsuario.id };

  // 3. Llama a Groq
  let respuesta = await groq.chat.completions.create({
    model: MODELO,
    messages: mensajes,
    tools: herramientas.length > 0 ? herramientas : undefined,
  });

  let opcion = respuesta.choices[0];

  // 4. Si el modelo pide usar herramientas, ejecútalas y continúa el ciclo
  while (opcion.finish_reason === "tool_calls" && opcion.message.tool_calls) {
    mensajes.push(opcion.message);

    for (const llamada of opcion.message.tool_calls) {
      const nombreSkill = llamada.function.name;
      const skill = registroSkills.obtener(nombreSkill);

      let entrada: unknown = {};
      try {
        entrada = JSON.parse(llamada.function.arguments);
      } catch {
        // argumentos vacíos o inválidos, se ejecuta con {}
      }

      let resultado;
      if (!skill) {
        resultado = { exitoso: false, salida: null, error: `Skill "${nombreSkill}" no encontrada` };
      } else {
        resultado = await skill.ejecutar(entrada, contexto);
      }

      await prisma.ejecucionHabilidad.create({
        data: {
          mensajeId: mensajeUsuario.id,
          nombreHabilidad: nombreSkill,
          entrada: entrada as any,
          salida: resultado.salida as any,
          exitoso: resultado.exitoso,
        },
      });

      mensajes.push({
        role: "tool",
        tool_call_id: llamada.id,
        content: JSON.stringify(resultado.salida ?? { error: resultado.error }),
      });
    }

    respuesta = await groq.chat.completions.create({
      model: MODELO,
      messages: mensajes,
      tools: herramientas.length > 0 ? herramientas : undefined,
    });
    opcion = respuesta.choices[0];
  }

  // 5. Guarda la respuesta final del asistente
  const textoFinal = opcion.message.content ?? "";

  const mensajeAsistente = await prisma.mensaje.create({
    data: { conversacionId, rol: "asistente", contenido: textoFinal },
  });

  return { mensajeUsuario, mensajeAsistente };
}