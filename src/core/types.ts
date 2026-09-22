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
  nombre: string;          // ej: "clima/consultar"
  descripcion: string;
  // valida y ejecuta la skill con el input recibido
  ejecutar: (entrada: unknown, contexto: ContextoSkill) => Promise<ResultadoSkill>;
}