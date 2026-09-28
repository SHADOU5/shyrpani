import { Skill } from "../../core/types";
import { prisma } from "../../db/cliente";


const skillNotas: Skill = {
  nombre: "gestionar_notas",
  descripcion: "Crea o lista notas/recordatorios guardados del usuario. Úsala cuando el usuario pida anotar algo, recordar algo, o consultar sus notas guardadas.",
  esquemaEntrada: {
    type: "object",
    properties: {
      accion: {
        type: "string",
        enum: ["crear", "listar"],
        description: "'crear' para guardar una nota nueva, 'listar' para ver las notas existentes",
      },
      contenido: {
        type: "string",
        description: "El texto de la nota (solo requerido cuando accion es 'crear')",
      },
    },
    required: ["accion"],
  },
  async ejecutar(entrada, contexto) {
    const { accion, contenido } = entrada as { accion: "crear" | "listar"; contenido?: string };

    try {
      if (accion === "crear") {
        if (!contenido) {
          return { exitoso: false, salida: null, error: "Falta el contenido de la nota" };
        }

        const nota = await prisma.nota.create({
          data: { usuarioId: contexto.usuarioId, contenido },
        });

        return {
          exitoso: true,
          salida: { mensaje: "Nota guardada", nota: { id: nota.id, contenido: nota.contenido } },
        };
      }

      if (accion === "listar") {
        const notas = await prisma.nota.findMany({
          where: { usuarioId: contexto.usuarioId, completada: false },
          orderBy: { creadoEn: "desc" },
          take: 20,
        });

        return {
          exitoso: true,
          salida: {
            total: notas.length,
            notas: notas.map((n) => ({ id: n.id, contenido: n.contenido, creadoEn: n.creadoEn })),
          },
        };
      }

      return { exitoso: false, salida: null, error: `Acción desconocida: ${accion}` };
    } catch (error) {
      return { exitoso: false, salida: null, error: "Error accediendo a las notas" };
    }
  },
};

export default skillNotas;