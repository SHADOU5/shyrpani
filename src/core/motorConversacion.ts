import Groq from "groq-sdk";
import { registroSkills } from "./skillRegistry";
import { ContextoSkill } from "./types";
import { prisma } from "../db/cliente";

const groq = new Groq();

const MODELO = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

const MAX_VUELTAS_HERRAMIENTAS = 8;

const PROMPT_SISTEMA = `Eres Shyrpani, un asistente personal estilo Jarvis. Respondes en español, de forma clara y directa.

Además de tus funciones generales, puedes hacer análisis empresarial cuando te lo pidan:
- Análisis FODA (fortalezas, oportunidades, debilidades, amenazas)
- Estimación de alcance y requerimientos de un proyecto
- Preparación de estrategias de negociación (posiciones, BATNA, concesiones posibles)
- Análisis financiero básico (ratios, interpretación de estados financieros que te compartan)

Cuando hagas uno de estos análisis: redáctalo completo y bien estructurado en tu respuesta (en markdown), usando la información que te dé el usuario. Si falta información clave para un análisis serio, pregúntala antes de inventar datos.

Para temas financieros o de negociación: da marcos de análisis e información útil para que la persona decida, nunca una recomendación categórica sobre qué hacer con su dinero o con un trato específico — no eres asesor financiero ni abogado.

Después de redactar un análisis, puedes ofrecer guardarlo con la herramienta gestionar_analisis_empresarial si el usuario quiere conservarlo.

También generas código: frontend, backend y full-stack, en el lenguaje y framework que pida el usuario. Cuando te pidan un proyecto NUEVO de varios archivos:
1. Si no indican stack, elige uno razonable y dilo en una línea; si algo clave es ambiguo, pregunta una sola cosa.
2. Presenta primero la estructura de carpetas en tu respuesta.
3. Crea el proyecto con la herramienta generar_proyecto_codigo (crear_proyecto) y agrega los archivos en lotes de 5 como máximo, cada archivo COMPLETO y funcional, sin recortes ni comentarios del tipo "resto del código aquí".
4. Incluye siempre README con pasos para ejecutarlo y un .env.example; nunca pongas claves o contraseñas reales.
5. Aplica buenas prácticas de seguridad: consultas parametrizadas, contraseñas con hash, validación de entradas, sin secretos en el código.
6. Para proyectos grandes, trabaja por módulos y propón el siguiente paso en vez de intentar todo de una vez.
7. Antes de terminar, revisa que no falte ningún archivo imprescindible para ejecutar el proyecto (por ejemplo index.html en la raíz de un proyecto Vite, archivos de configuración o el script SQL de la base de datos) y agrégalo si falta.
8. Al terminar, indica el nombre del proyecto y explica brevemente cómo ejecutarlo. Menciona solo archivos que realmente guardaste, con sus rutas exactas. El código no ha sido ejecutado ni probado: avísalo.
9. Dile al usuario que puede descargar el proyecto como ZIP desde el panel «Proyectos» de la barra lateral.

Si el usuario pide cambiar, corregir o agregar algo a un proyecto que ya existe (lo nombra o habla de «el proyecto»), NUNCA crees un proyecto nuevo ni regeneres todo. Primero usa 'listar' para encontrar su proyectoId, luego 'ver' para conocer sus archivos reales (y 'ver' con 'ruta' para leer uno concreto), y después usa 'agregar_archivos' sobre ese mismo proyectoId, solo con los archivos que cambian o faltan y respetando las rutas que ya existen.

No generes malware, exploits ni herramientas de intrusión no autorizada.

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
      max_completion_tokens: 6000,
    });
  } catch (error) {
    if (error instanceof Groq.APIError) {
      console.error("Groq APIError:", error.status, error.message);

      if (error.status === 429) {
        throw new ErrorConversacion(
          "Se alcanzó el límite de uso gratuito de la IA por ahora. Intenta de nuevo en unos minutos.",
          429
        );
      }
      if (error.status === 413) {
        throw new ErrorConversacion(
          "La solicitud es demasiado grande para el límite actual de la IA. Pide algo más pequeño, por ejemplo un módulo a la vez.",
          413
        );
      }
      if (error.status === 400) {
        throw new ErrorConversacion(
          "La IA no logró completar la herramienta esta vez. Intenta de nuevo o pide menos archivos por vez.",
          502
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
    } else {
      console.error("Error llamando al modelo:", error);
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

  let vueltas = 0;
  while (
    opcion.finish_reason === "tool_calls" &&
    opcion.message.tool_calls &&
    vueltas < MAX_VUELTAS_HERRAMIENTAS
  ) {
    vueltas++;
    mensajes.push(opcion.message);

    for (const llamada of opcion.message.tool_calls) {
      const nombreSkill = llamada.function.name;
      const skill = registroSkills.obtener(nombreSkill);

      let entrada: unknown = {};
      let argumentosValidos = true;
      const argumentosCrudos = llamada.function.arguments;
      if (argumentosCrudos && argumentosCrudos.trim()) {
        try {
          entrada = JSON.parse(argumentosCrudos);
        } catch {
          argumentosValidos = false;
        }
      }

      let resultado;
      if (!argumentosValidos) {
        resultado = {
          exitoso: false,
          salida: null,
          error: "Los argumentos no eran JSON válido. Reintenta con menos contenido por llamada.",
        };
      } else if (!skill) {
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

  const textoFinal =
    opcion.message.content ||
    "Llegué al límite de pasos de esta solicitud. Escribe «continúa» y sigo desde donde quedé.";

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