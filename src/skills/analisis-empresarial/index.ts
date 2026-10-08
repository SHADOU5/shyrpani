import { prisma } from "../../db/cliente";
import { Skill } from "../../core/types";

const skillAnalisis: Skill = {
  nombre: "gestionar_analisis_empresarial",
  descripcion:
    "Guarda o lista análisis empresariales ya elaborados (FODA, estimaciones de proyecto, estrategias de negociación, análisis financiero). " +
    "Úsala SOLO después de haber redactado tú mismo el análisis completo en tu respuesta: pasa accion='crear' con el texto ya terminado para guardarlo. " +
    "Usa accion='listar' cuando el usuario pida ver sus análisis guardados.",
  esquemaEntrada: {
    type: "object",
    properties: {
      accion: {
        type: "string",
        enum: ["crear", "listar"],
      },
      tipo: {
        type: "string",
        enum: ["foda", "estimacion", "negociacion", "financiero"],
        description: "Tipo de análisis (solo requerido para 'crear')",
      },
      titulo: {
        type: "string",
        description: "Título breve del análisis, ej: 'FODA - Panadería El Trigal' (solo para 'crear')",
      },
      contenido: {
        type: "string",
        description: "El análisis completo ya redactado, en markdown (solo para 'crear')",
      },
    },
    required: ["accion"],
  },
  async ejecutar(entrada, contexto) {
    const { accion, tipo, titulo, contenido } = entrada as {
      accion: "crear" | "listar";
      tipo?: string;
      titulo?: string;
      contenido?: string;
    };

    try {
      if (accion === "crear") {
        if (!tipo || !titulo || !contenido) {
          return { exitoso: false, salida: null, error: "Faltan tipo, titulo o contenido" };
        }

        const analisis = await prisma.analisisEmpresarial.create({
          data: { usuarioId: contexto.usuarioId, tipo, titulo, contenido },
        });

        return {
          exitoso: true,
          salida: { mensaje: "Análisis guardado", id: analisis.id, titulo: analisis.titulo },
        };
      }

      if (accion === "listar") {
        const analisis = await prisma.analisisEmpresarial.findMany({
          where: { usuarioId: contexto.usuarioId },
          orderBy: { creadoEn: "desc" },
          take: 20,
          select: { id: true, tipo: true, titulo: true, creadoEn: true },
        });

        return { exitoso: true, salida: { total: analisis.length, analisis } };
      }

      return { exitoso: false, salida: null, error: `Acción desconocida: ${accion}` };
    } catch {
      return { exitoso: false, salida: null, error: "Error accediendo a los análisis guardados" };
    }
  },
};

export default skillAnalisis;