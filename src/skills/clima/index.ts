import { Skill } from "../../core/types";

// Mapea el código de clima de Open-Meteo a una descripción en español
function describirClima(codigo: number): string {
  const descripciones: Record<number, string> = {
    0: "despejado",
    1: "mayormente despejado",
    2: "parcialmente nublado",
    3: "nublado",
    45: "con neblina",
    48: "con neblina escarchada",
    51: "con llovizna ligera",
    53: "con llovizna moderada",
    55: "con llovizna intensa",
    61: "con lluvia ligera",
    63: "con lluvia moderada",
    65: "con lluvia intensa",
    71: "con nevada ligera",
    73: "con nevada moderada",
    75: "con nevada intensa",
    80: "con chubascos ligeros",
    81: "con chubascos moderados",
    82: "con chubascos violentos",
    95: "con tormenta eléctrica",
  };
  return descripciones[codigo] ?? "con condiciones variables";
}

const skillClima: Skill = {
  nombre: "consultar_clima",
  descripcion: "Consulta el clima actual de una ciudad del mundo. Úsala cuando el usuario pregunte por el clima, temperatura o condiciones del tiempo en algún lugar.",
  esquemaEntrada: {
    type: "object",
    properties: {
      ciudad: { type: "string", description: "Nombre de la ciudad, ej: 'Abancay', 'Lima', 'Madrid'" },
    },
    required: ["ciudad"],
  },
  async ejecutar(entrada) {
    const { ciudad } = entrada as { ciudad: string };

    try {
      // 1. Geocodificación: convierte el nombre de la ciudad en coordenadas
      const urlGeo = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es`;
      const respGeo = await fetch(urlGeo);
      const datosGeo = await respGeo.json();

      if (!datosGeo.results || datosGeo.results.length === 0) {
        return { exitoso: false, salida: null, error: `No se encontró la ciudad "${ciudad}"` };
      }

      const lugar = datosGeo.results[0];
      const { latitude, longitude, name, country } = lugar;

      // 2. Consulta el clima actual con esas coordenadas
      const urlClima = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`;
      const respClima = await fetch(urlClima);
      const datosClima = await respClima.json();

      const actual = datosClima.current;

      return {
        exitoso: true,
        salida: {
          ciudad: name,
          pais: country,
          temperatura_c: actual.temperature_2m,
          condicion: describirClima(actual.weather_code),
          humedad_porcentaje: actual.relative_humidity_2m,
          viento_kmh: actual.wind_speed_10m,
        },
      };
    } catch (error) {
      return { exitoso: false, salida: null, error: "Error consultando el servicio de clima" };
    }
  },
};

export default skillClima;