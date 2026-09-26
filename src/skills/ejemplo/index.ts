import { Skill } from "../../core/types";

const skillEjemplo: Skill = {
  nombre: "sistema_eco",
  descripcion: "Repite el texto recibido. Úsala solo si el usuario pide explícitamente probar el sistema de skills.",
  esquemaEntrada: {
    type: "object",
    properties: {
      texto: { type: "string", description: "Texto a repetir" },
    },
    required: ["texto"],
  },
  async ejecutar(entrada, contexto) {
    const { texto } = entrada as { texto: string };
    return {
      exitoso: true,
      salida: { eco: texto, usuarioId: contexto.usuarioId },
    };
  },
};

export default skillEjemplo;