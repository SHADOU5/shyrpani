import { Skill } from "../../core/types";

interface ResultadoTavily {
  title: string;
  url: string;
  content: string;
}

const skillBusquedaWeb: Skill = {
  nombre: "buscar_en_internet",
  descripcion: "Busca información actual en internet. Úsala cuando el usuario pregunte algo que requiera datos recientes, noticias, o información que no sepas con certeza.",
  esquemaEntrada: {
    type: "object",
    properties: {
      consulta: { type: "string", description: "Los términos de búsqueda, ej: 'resultados elecciones Perú 2026'" },
    },
    required: ["consulta"],
  },
  async ejecutar(entrada) {
    const { consulta } = entrada as { consulta: string };
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      return { exitoso: false, salida: null, error: "TAVILY_API_KEY no configurada" };
    }

    try {
      const respuesta = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: consulta,
          max_results: 5,
          search_depth: "basic",
        }),
      });

      if (!respuesta.ok) {
        return { exitoso: false, salida: null, error: `Tavily respondió con estado ${respuesta.status}` };
      }

      const datos = await respuesta.json();

      const resultados = (datos.results as ResultadoTavily[]).map((r) => ({
        titulo: r.title,
        url: r.url,
        resumen: r.content,
      }));

      return {
        exitoso: true,
        salida: {
          consulta,
          respuesta_directa: datos.answer ?? null,
          resultados,
        },
      };
    } catch (error) {
      return { exitoso: false, salida: null, error: "Error consultando el servicio de búsqueda" };
    }
  },
};

export default skillBusquedaWeb;