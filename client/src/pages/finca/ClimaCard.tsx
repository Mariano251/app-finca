import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useUpdate } from "../../api/useCrud";
import type { Clima, Finca } from "../../api/types";

const diaCorto = (fecha: string) =>
  new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric" });

function useClima(fincaId: number, enabled: boolean) {
  return useQuery<Clima>({
    queryKey: ["/fincas", fincaId, "clima"],
    queryFn: async () => (await api.get(`/fincas/${fincaId}/clima`)).data,
    enabled,
    staleTime: 15 * 60 * 1000,
  });
}

export function ClimaCard({ finca }: { finca: Finca }) {
  const tieneUbicacion = finca.latitud != null && finca.longitud != null;
  const { data: clima, isLoading, isError } = useClima(finca.id, tieneUbicacion);
  const updateFinca = useUpdate<Finca>("/fincas");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  function usarUbicacionActual() {
    if (!("geolocation" in navigator)) {
      setGeoError("Este navegador no puede obtener la ubicación.");
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        updateFinca.mutate({
          id: finca.id,
          data: { latitud: pos.coords.latitude, longitud: pos.coords.longitude },
        });
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "No diste permiso de ubicación. Activalo desde el navegador e intentá de nuevo."
            : "No se pudo obtener la ubicación. Probá de nuevo, o cargala a mano en \"Editar\"."
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div className="card" style={{ marginTop: "1.25rem" }}>
      <div className="page-header" style={{ marginBottom: tieneUbicacion ? "0.5rem" : 0 }}>
        <h2 style={{ margin: 0 }}>Clima</h2>
        <button className="btn secondary small" onClick={usarUbicacionActual} disabled={geoLoading}>
          📍 {geoLoading ? "Buscando…" : tieneUbicacion ? "Actualizar ubicación" : "Usar mi ubicación actual"}
        </button>
      </div>

      {geoError && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-danger)", marginTop: "0.4rem" }}>{geoError}</p>
      )}

      {!tieneUbicacion && !geoError && (
        <p className="text-muted" style={{ fontSize: "0.85rem" }}>
          Configurá la ubicación de la finca (parado en el campo, tocá "Usar mi ubicación actual") para ver el
          pronóstico de 7 días y alertas de helada, viento y lluvia.
        </p>
      )}

      {tieneUbicacion && isLoading && <p className="text-muted">Cargando pronóstico…</p>}
      {tieneUbicacion && isError && (
        <p className="text-muted">No se pudo obtener el pronóstico ahora. Probá de nuevo más tarde.</p>
      )}

      {tieneUbicacion && clima && (
        <div style={{ display: "flex", gap: "0.6rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          {clima.dias.map((d) => (
            <div
              key={d.fecha}
              className="card"
              style={{
                minWidth: "108px",
                padding: "0.6rem",
                background:
                  d.riesgoHelada || d.vientoFuerte || d.lluviaProbable ? "#fbe9e7" : "var(--color-surface)",
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "capitalize" }}>
                {diaCorto(d.fecha)}
              </div>
              <div style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>
                {Math.round(d.tempMin)}° / {Math.round(d.tempMax)}°
              </div>
              <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                💧 {d.precipitacionMm.toLocaleString("es-AR")} mm
                {d.probabilidadLluvia != null ? ` (${d.probabilidadLluvia}%)` : ""}
              </div>
              <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                💨 {Math.round(d.vientoMaxKmh)} km/h
              </div>
              <div style={{ marginTop: "0.3rem", display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
                {d.riesgoHelada && (
                  <span className="tag" style={{ background: "#fbe9e7", color: "var(--color-danger)" }}>
                    ❄️ Helada
                  </span>
                )}
                {d.vientoFuerte && (
                  <span className="tag" style={{ background: "#fbe9e7", color: "var(--color-danger)" }}>
                    💨 Viento
                  </span>
                )}
                {d.lluviaProbable && (
                  <span className="tag" style={{ background: "#fbe9e7", color: "var(--color-danger)" }}>
                    🌧️ Lluvia
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
