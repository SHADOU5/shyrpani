import Groq from "groq-sdk";
import { registroSkills } from "./skillRegistry";
import { ContextoSkill } from "./types";
import { prisma } from "../db/cliente";

const groq = new Groq();

const MODELO = "openai/gpt-oss-20b";

const PROMPT_SISTEMA = `Eres Shyrpani, un asistente personal estilo Jarvis. Respondes en español, de forma clara y directa.

  Además de tus funciones generales, puedes hacer análisis empresarial cuando te lo pidan:
  - Análisis FODA (fortalezas, oportunidades, debilidades, amenazas)
  - Estimación de alcance y requerimientos de un proyecto
  - Preparación de estrategias de negociación (posiciones, BATNA, concesiones posibles)
  - Análisis financiero básico (ratios, interpretación de estados financieros que te compartan)

  Cuando hagas uno de estos análisis: redáctalo completo y bien estructurado en tu respuesta (en markdown), usando la información que te dé el usuario. Si falta información clave para un análisis serio, pregúntala antes de inventar datos.

  Para temas financieros o de negociación: da marcos de análisis e información útil para que la persona decida, nunca una recomendación categórica sobre qué hacer con su dinero o con un trato específico — no eres asesor financiero ni abogado.

  Después de redactar un análisis, puedes ofrecer guardarlo con la herramienta gestionar_analisis_empresarial si el usuario quiere conservarlo.

  Usa las demás herramientas disponibles solo cuando realmente lo necesites.`;

// Error controlado que ya trae un mensaje seguro para mostrar al usuario
export class ErrorConversacion extends Error {
  codigoHttp: number;
  constructor(mensajeUsuario: string, codigoHttp: number) {
    super(mensajeUsuario);
    this.codigoHttp = codigoHttp;
  }
}

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

async function llamarModelo(
  mensajes: Groq.Chat.ChatCompletionMessageParam[],
  herramientas: ReturnType<typeof construirHerramientas>
) {
  try {
    return await groq.chat.completions.create({
      model: MODELO,
      messages: mensajes,
      tools: herramientas.length > 0 ? herramientas : undefined,
    });
  } catch (error) {
    if (error instanceof Groq.APIError) {
      if (error.status === 429) {
        throw new ErrorConversacion(
          "Se alcanzó el límite de uso gratuito de la IA por ahora. Intenta de nuevo en unos minutos.",
          429
        );
      }
      if (error.status === 401 || error.status === 403) {
        throw new ErrorConversacion(
          "Hay un problema con la configuración de la IA (clave inválida). Contacta al administrador.",
          502
        );
      }
      if (error.status >= 500) {
        throw new ErrorConversacion(
          "El servicio de IA no está disponible en este momento. Intenta de nuevo en unos minutos.",
          503
        );
      }
    }
    throw new ErrorConversacion("Ocurrió un error inesperado al procesar tu mensaje.", 500);
  }
}

export async function procesarMensaje(params: {
  usuarioId: string;
  conversacionId: string;
  contenido: string;
}) {
  const { usuarioId, conversacionId, contenido } = params;

  const mensajeUsuario = await prisma.mensaje.create({
    data: { conversacionId, rol: "usuario", contenido },
  });

  const historialDesc = await prisma.mensaje.findMany({
    where: { conversacionId },
    orderBy: { creadoEn: "desc" },
    take: 20,
  });
  const historial = historialDesc.reverse();

  const mensajes: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: PROMPT_SISTEMA },
    ...historial.map((m): Groq.Chat.ChatCompletionMessageParam => ({
      role: m.rol === "asistente" ? "assistant" : "user",
      content: m.contenido,
    })),
  ];

  const herramientas = construirHerramientas();
  const contexto: ContextoSkill = { usuarioId, conversacionId, mensajeId: mensajeUsuario.id };

  let respuesta = await llamarModelo(mensajes, herramientas);
  let opcion = respuesta.choices[0];

  while (opcion.finish_reason === "tool_calls" && opcion.message.tool_calls) {
    mensajes.push(opcion.message);

    for (const llamada of opcion.message.tool_calls) {
      const nombreSkill = llamada.function.name;
      const skill = registroSkills.obtener(nombreSkill);

      let entrada: unknown = {};
      try {
        entrada = JSON.parse(llamada.function.arguments);
      } catch {
        // argumentos vacíos o inválidos
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

    respuesta = await llamarModelo(mensajes, herramientas);
    opcion = respuesta.choices[0];
  }

  const textoFinal = opcion.message.content ?? "";

    const mensajeAsistente = await prisma.mensaje.create({
    data: { conversacionId, rol: "asistente", contenido: textoFinal },
  });

  const conversacionActual = await prisma.conversacion.findUnique({
    where: { id: conversacionId },
    select: { titulo: true },
  });

  if (conversacionActual && !conversacionActual.titulo) {
    await prisma.conversacion.update({
      where: { id: conversacionId },
      data: { titulo: contenido.slice(0, 60) },
    });
  }

  return { mensajeUsuario, mensajeAsistente };

  
}