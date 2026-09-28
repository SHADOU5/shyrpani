import { Skill } from "./types";
import skillEjemplo from "../skills/ejemplo";
import skillClima from "../skills/clima";
import skillBusquedaWeb from "../skills/busqueda-web";
import skillNotas from "../skills/notas";

class RegistroSkills {
  private skills = new Map<string, Skill>();

  cargarTodas() {
    const todas: Skill[] = [skillEjemplo, skillClima, skillBusquedaWeb, skillNotas];

    for (const skill of todas) {
      this.skills.set(skill.nombre, skill);
      console.log(`Skill registrada: ${skill.nombre}`);
    }
  }

  obtener(nombre: string): Skill | undefined {
    return this.skills.get(nombre);
  }

  listar(): Skill[] {
    return [...this.skills.values()];
  }
}

export const registroSkills = new RegistroSkills();
registroSkills.cargarTodas(); // se carga una sola vez al importar el módulo