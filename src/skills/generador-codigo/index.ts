import { prisma } from "../../db/cliente";
import { Skill } from "../../core/types";

const MAX_ARCHIVOS_POR_LLAMADA = 5;

// Evita rutas peligrosas o raras dentro del proyecto (nada de "..", rutas absolutas, etc.)
function rutaSegura(ruta: unknown): ruta is string {
  if (typeof ruta !== "string" || !ruta || ruta.length > 200) return false;
  if (ruta.startsWith("/") || ruta.includes("\\") || ruta.includes(":")) return false;
  return !ruta.split("/").some((parte) => parte === "" || parte === "." || parte === "..");
}

type ArchivoEntrada = { ruta: string; contenido: string };

const skillGeneradorCodigo: Skill = {
  nombre: "generar_proyecto_codigo",
  descripcion:
    "Guarda proyectos de código de varios archivos (frontend, backend o full-stack, en cualquier lenguaje o framework) para que el usuario los descargue. " +
    "Flujo para un proyecto NUEVO: 1) accion='crear_proyecto' con nombre y stack; 2) accion='agregar_archivos' con el proyectoId, máximo " +
    MAX_ARCHIVOS_POR_LLAMADA +
    " archivos COMPLETOS por llamada (repite la llamada para el resto). " +
    "Para CAMBIAR un proyecto que ya existe: accion='listar' para encontrar su proyectoId, accion='ver' para ver sus rutas reales (o el contenido de un archivo si pasas 'ruta'), y accion='agregar_archivos' solo con lo que cambia o falta. " +
    "Nunca regeneres ni dupliques un proyecto existente.",
  esquemaEntrada: {
    type: "object",
    properties: {
      accion: { type: "string", enum: ["crear_proyecto", "agregar_archivos", "listar", "ver"] },
      proyectoId: { type: "string", description: "Requerido para agregar_archivos y ver" },
      nombre: { type: "string", description: "Nombre del proyecto (crear_proyecto)" },
      descripcion: { type: "string", description: "Qué hace el proyecto (crear_proyecto)" },
      stack: {
        type: "string",
        description: "Tecnologías usadas, ej: 'React + Vite, Express, PostgreSQL' (crear_proyecto)",
      },
      archivos: {
        type: "array",
        description: "Archivos a guardar (agregar_archivos). Si una ruta ya existe, se sobrescribe.",
        items: {
          type: "object",
          properties: {
            ruta: { type: "string", description: "Ruta relativa, ej: 'backend/src/index.js'" },
            contenido: { type: "string", description: "Contenido completo del archivo, sin recortar" },
          },
          required: ["ruta", "contenido"],
        },
      },
      ruta: { type: "string", description: "Ruta de un archivo concreto a leer (ver)" },
    },
    required: ["accion"],
  },
  async ejecutar(entrada, contexto) {
    const { accion, proyectoId, nombre, descripcion, stack, archivos, ruta } = entrada as {
      accion: "crear_proyecto" | "agregar_archivos" | "listar" | "ver";
      proyectoId?: string;
      nombre?: string;
      descripcion?: string;
      stack?: string;
      archivos?: ArchivoEntrada[];
      ruta?: string;
    };

    try {
      if (accion === "crear_proyecto") {
        if (!nombre || !stack) {
          return { exitoso: false, salida: null, error: "Faltan nombre o stack" };
        }

        const mismoNombre = { equals: nombre, mode: "insensitive" as const };

        // 1) Si ya hay un proyecto con archivos y ese nombre, no se crea otro
        const conArchivos = await prisma.proyectoCodigo.findFirst({
          where: {
            usuarioId: contexto.usuarioId,
            nombre: mismoNombre,
            archivos: { some: {} },
          },
          select: { id: true, nombre: true },
        });

        if (conArchivos) {
          return {
            exitoso: false,
            salida: null,
            error:
              `Ya existe un proyecto llamado "${conArchivos.nombre}" (proyectoId: ${conArchivos.id}). ` +
              "No crees uno nuevo: usa accion='ver' con ese proyectoId para ver sus archivos reales " +
              "y accion='agregar_archivos' solo con lo que falte o cambie. " +
              "Si de verdad quieres un proyecto distinto, usa otro nombre.",
          };
        }

        // 2) Si hay uno vacío con ese nombre (intento anterior fallido), se reutiliza
        const vacio = await prisma.proyectoCodigo.findFirst({
          where: {
            usuarioId: contexto.usuarioId,
            nombre: mismoNombre,
            archivos: { none: {} },
          },
          select: { id: true, nombre: true },
        });

        if (vacio) {
          return {
            exitoso: true,
            salida: { proyectoId: vacio.id, nombre: vacio.nombre, nota: "Se reutilizó un proyecto vacío existente" },
          };
        }

        const proyecto = await prisma.proyectoCodigo.create({
          data: { usuarioId: contexto.usuarioId, nombre, descripcion, stack },
        });
        return { exitoso: true, salida: { proyectoId: proyecto.id, nombre: proyecto.nombre } };
      }

      if (accion === "agregar_archivos") {
        if (!proyectoId || !Array.isArray(archivos) || archivos.length === 0) {
          return { exitoso: false, salida: null, error: "Faltan proyectoId o archivos" };
        }
        if (archivos.length > MAX_ARCHIVOS_POR_LLAMADA) {
          return {
            exitoso: false,
            salida: null,
            error: `Máximo ${MAX_ARCHIVOS_POR_LLAMADA} archivos por llamada; divide en varias llamadas`,
          };
        }
        for (const a of archivos) {
          if (!rutaSegura(a?.ruta) || typeof a.contenido !== "string") {
            return { exitoso: false, salida: null, error: `Ruta o contenido inválido: ${String(a?.ruta)}` };
          }
        }

        const proyecto = await prisma.proyectoCodigo.findFirst({
          where: { id: proyectoId, usuarioId: contexto.usuarioId },
          select: { id: true },
        });
        if (!proyecto) {
          return { exitoso: false, salida: null, error: "Proyecto no encontrado" };
        }

        await prisma.$transaction(
          archivos.map((a) =>
            prisma.archivoProyecto.upsert({
              where: { proyectoId_ruta: { proyectoId, ruta: a.ruta } },
              update: { contenido: a.contenido },
              create: { proyectoId, ruta: a.ruta, contenido: a.contenido },
            })
          )
        );

        // Devuelve el árbol real del proyecto para que el resumen use rutas exactas
        const todas = await prisma.archivoProyecto.findMany({
          where: { proyectoId },
          orderBy: { ruta: "asc" },
          select: { ruta: true },
        });

        return {
          exitoso: true,
          salida: {
            guardados: archivos.map((a) => a.ruta),
            archivosEnProyecto: todas.map((r) => r.ruta),
          },
        };
      }

      if (accion === "listar") {
        const proyectos = await prisma.proyectoCodigo.findMany({
          where: { usuarioId: contexto.usuarioId, archivos: { some: {} } },
          orderBy: { creadoEn: "desc" },
          take: 20,
          select: { id: true, nombre: true, stack: true, _count: { select: { archivos: true } } },
        });
        return { exitoso: true, salida: { total: proyectos.length, proyectos } };
      }

      if (accion === "ver") {
        if (!proyectoId) {
          return { exitoso: false, salida: null, error: "Falta proyectoId" };
        }
        const proyecto = await prisma.proyectoCodigo.findFirst({
          where: { id: proyectoId, usuarioId: contexto.usuarioId },
          select: { id: true, nombre: true, stack: true, descripcion: true },
        });
        if (!proyecto) {
          return { exitoso: false, salida: null, error: "Proyecto no encontrado" };
        }

        if (ruta) {
          const archivo = await prisma.archivoProyecto.findUnique({
            where: { proyectoId_ruta: { proyectoId, ruta } },
            select: { ruta: true, contenido: true },
          });
          if (!archivo) return { exitoso: false, salida: null, error: "Archivo no encontrado" };
          return { exitoso: true, salida: archivo };
        }

        const rutas = await prisma.archivoProyecto.findMany({
          where: { proyectoId },
          orderBy: { ruta: "asc" },
          select: { ruta: true },
        });
        return { exitoso: true, salida: { ...proyecto, archivos: rutas.map((r) => r.ruta) } };
      }

      return { exitoso: false, salida: null, error: `Acción desconocida: ${accion}` };
    } catch {
      return { exitoso: false, salida: null, error: "Error accediendo a los proyectos de código" };
    }
  },
};

export default skillGeneradorCodigo;