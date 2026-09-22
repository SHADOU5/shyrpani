import { Skill } from "../../core/types";

const skillEjemplo: Skill = {
  nombre: "sistema/eco",
  descripcion: "Repite el texto recibido, útil para probar que el registro de skills funciona.",
  async ejecutar(entrada, contexto) {
    const texto = typeof entrada === "object" && entrada !== null && "texto" in entrada
      ? (entrada as { texto: string }).texto
      : String(entrada);

    return {
      exitoso: true,
      salida: { eco: texto, usuarioId: contexto.usuarioId },
    };
  },
};

export default skillEjemplo;