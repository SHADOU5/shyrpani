import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Skill } from "./types";

class RegistroSkills {
  private skills = new Map<string, Skill>();

  async cargarTodas() {
    const carpetaSkills = path.join(__dirname, "..", "skills");
    const entradas = fs.readdirSync(carpetaSkills, { withFileTypes: true });

    for (const entrada of entradas) {
        if (!entrada.isDirectory()) continue;

        const rutaArchivo = path.join(carpetaSkills, entrada.name, "index.ts");
        const rutaSkill = pathToFileURL(rutaArchivo).href;
        try {
            const modulo = await import(rutaSkill);
            const skill: Skill = modulo.default;

        if (!skill?.nombre || typeof skill.ejecutar !== "function") {
            console.warn(`Skill inválida en carpeta "${entrada.name}", se omite.`);
            continue;
        }

        this.skills.set(skill.nombre, skill);
        console.log(`Skill registrada: ${skill.nombre}`);
      } catch (error) {
        console.error(`Error cargando skill en "${entrada.name}":`, error);
      }
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