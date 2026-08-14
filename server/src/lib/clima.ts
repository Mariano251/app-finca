/**
 * Pronóstico de clima por finca vía Open-Meteo (gratis, sin API key). Se cachea en memoria por
 * coordenada para no pegarle a la API en cada request — el pronóstico no cambia minuto a minuto.
 */

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const CACHE_MS = 30 * 60 * 1000; // 30 minutos
const FORECAST_DAYS = 7;

// Umbrales agronómicos para las alertas — no hay un estándar único, son valores de referencia
// habituales (helada bajo ~3°C por el margen del sensor, viento >15 km/h ya complica una
// aplicación fitosanitaria por deriva).
const UMBRAL_HELADA_C = 3;
const UMBRAL_VIENTO_KMH = 15;
const UMBRAL_PROB_LLUVIA = 60;

export interface ClimaDia {
  fecha: string;
  tempMin: number;
  tempMax: number;
  precipitacionMm: number;
  probabilidadLluvia: number | null;
  vientoMaxKmh: number;
  riesgoHelada: boolean;
  vientoFuerte: boolean;
  lluviaProbable: boolean;
}

export interface ClimaResponse {
  actualizado: string;
  dias: ClimaDia[];
}

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_min: number[];
  temperature_2m_max: number[];
  precipitation_sum: number[];
  precipitation_probability_max: (number | null)[];
  windspeed_10m_max: number[];
}

const cache = new Map<string, { expira: number; data: ClimaResponse }>();

export async function obtenerClima(lat: number, lon: number): Promise<ClimaResponse> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = cache.get(key);
  if (cached && cached.expira > Date.now()) return cached.data;

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: "temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,windspeed_10m_max",
    windspeed_unit: "kmh",
    timezone: "auto",
    forecast_days: String(FORECAST_DAYS),
  });

  const res = await fetch(`${OPEN_METEO_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`Open-Meteo respondió ${res.status}`);
  }
  const json = (await res.json()) as { daily: OpenMeteoDaily };
  const d = json.daily;

  const dias: ClimaDia[] = d.time.map((fecha, i) => {
    const tempMin = d.temperature_2m_min[i];
    const tempMax = d.temperature_2m_max[i];
    const precipitacionMm = d.precipitation_sum[i];
    const probabilidadLluvia = d.precipitation_probability_max?.[i] ?? null;
    const vientoMaxKmh = d.windspeed_10m_max[i];
    return {
      fecha,
      tempMin,
      tempMax,
      precipitacionMm,
      probabilidadLluvia,
      vientoMaxKmh,
      riesgoHelada: tempMin <= UMBRAL_HELADA_C,
      vientoFuerte: vientoMaxKmh >= UMBRAL_VIENTO_KMH,
      lluviaProbable: (probabilidadLluvia ?? 0) >= UMBRAL_PROB_LLUVIA || precipitacionMm >= 1,
    };
  });

  const data: ClimaResponse = { actualizado: new Date().toISOString(), dias };
  cache.set(key, { expira: Date.now() + CACHE_MS, data });
  return data;
}
