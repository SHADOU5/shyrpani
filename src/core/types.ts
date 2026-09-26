export interface ContextoSkill {
  usuarioId: string;
  conversacionId: string;
  mensajeId: string;
}

export interface ResultadoSkill {
  exitoso: boolean;
  salida: unknown;
  error?: string;
}

export interface Skill {
  nombre: string;               // ej: "clima/consultar"
  descripcion: string;          // el modelo usa esto para decidir CUÁNDO usarla
  esquemaEntrada: {              // JSON Schema de los parámetros que recibe
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  ejecutar: (entrada: unknown, contexto: ContextoSkill) => Promise<ResultadoSkill>;
}