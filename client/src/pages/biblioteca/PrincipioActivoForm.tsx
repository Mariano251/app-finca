import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCreate, useList, useOne, useUpdate } from "../../api/useCrud";
import type { Cultivo, Organismo, PrincipioActivo } from "../../api/types";
import {
  TIPO_FITOSANITARIO_OPTIONS,
  MOVILIDAD_OPTIONS,
  REGISTRO_ARGENTINA_OPTIONS,
} from "../../constants";
import { MultiSelectPicker } from "../../components/MultiSelectPicker";

/**
 * Formulario dedicado (no RecordForm genérico) porque necesita multi-select para cultivos y
 * organismos objetivo — RecordForm sólo maneja campos de valor único.
 */
export default function PrincipioActivoForm() {
  const { id } = useParams();
  const editando = id !== undefined;
  const principioId = Number(id);
  const navigate = useNavigate();

  const { data: existente } = useOne<PrincipioActivo>("/principios-activos", editando ? principioId : undefined);
  const { data: cultivos } = useList<Cultivo>("/cultivos", { activo: "true" });
  const { data: organismos } = useList<Organismo>("/organismos");

  const create = useCreate<PrincipioActivo>("/principios-activos");
  const update = useUpdate<PrincipioActivo>("/principios-activos");
  const submitting = create.isPending || update.isPending;

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("OTRO");
  const [grupoAccion, setGrupoAccion] = useState("");
  const [movilidad, setMovilidad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [riesgoResistencia, setRiesgoResistencia] = useState("");
  const [recomendacionRotacion, setRecomendacionRotacion] = useState("");
  const [registroArgentina, setRegistroArgentina] = useState("PENDIENTE");
  const [fuenteInformacion, setFuenteInformacion] = useState("");
  const [fechaVerificacion, setFechaVerificacion] = useState("");
  const [cultivoIds, setCultivoIds] = useState<number[]>([]);
  const [organismoIds, setOrganismoIds] = useState<number[]>([]);

  useEffect(() => {
    if (!existente) return;
    setNombre(existente.nombre);
    setTipo(existente.tipo);
    setGrupoAccion(existente.grupoAccion ?? "");
    setMovilidad(existente.movilidad ?? "");
    setObservaciones(existente.observaciones ?? "");
    setRiesgoResistencia(existente.riesgoResistencia ?? "");
    setRecomendacionRotacion(existente.recomendacionRotacion ?? "");
    setRegistroArgentina(existente.registroArgentina);
    setFuenteInformacion(existente.fuenteInformacion ?? "");
    setFechaVerificacion(existente.fechaVerificacion?.slice(0, 10) ?? "");
    setCultivoIds((existente.cultivos ?? []).map((c) => c.id));
    setOrganismoIds((existente.organismos ?? []).map((o) => o.id));
  }, [existente]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const relaciones = editando
      ? {
          cultivos: { set: cultivoIds.map((id) => ({ id })) },
          organismos: { set: organismoIds.map((id) => ({ id })) },
        }
      : {
          cultivos: { connect: cultivoIds.map((id) => ({ id })) },
          organismos: { connect: organismoIds.map((id) => ({ id })) },
        };
    const body = {
      nombre,
      tipo,
      grupoAccion: grupoAccion || null,
      movilidad: movilidad || null,
      observaciones: observaciones || null,
      riesgoResistencia: riesgoResistencia || null,
      recomendacionRotacion: recomendacionRotacion || null,
      registroArgentina,
      fuenteInformacion: fuenteInformacion || null,
      fechaVerificacion: fechaVerificacion || null,
      ...relaciones,
    };

    if (editando) {
      update.mutate(
        { id: principioId, data: body as unknown as Partial<PrincipioActivo> },
        { onSuccess: () => navigate(`/biblioteca/principios-activos/${principioId}`) }
      );
    } else {
      create.mutate(body as unknown as Partial<PrincipioActivo>, {
        onSuccess: (creado) => navigate(`/biblioteca/principios-activos/${(creado as PrincipioActivo).id}`),
      });
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link
            to={editando ? `/biblioteca/principios-activos/${principioId}` : "/biblioteca/principios-activos"}
            className="text-muted"
            style={{ fontSize: "0.85rem" }}
          >
            ← Cancelar
          </Link>
          <h1>{editando ? "Editar principio activo" : "Nuevo principio activo"}</h1>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Nombre *</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required spellCheck={false} />
          </div>
          <div className="field">
            <label>Tipo de producto *</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
              {TIPO_FITOSANITARIO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Grupo de acción / resistencia</label>
            <input type="text" value={grupoAccion} onChange={(e) => setGrupoAccion(e.target.value)} placeholder="ej: IRAC 23" spellCheck={false} />
          </div>
          <div className="field">
            <label>Movilidad</label>
            <select value={movilidad} onChange={(e) => setMovilidad(e.target.value)}>
              <option value="">—</option>
              {MOVILIDAD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <MultiSelectPicker
          label="Cultivos donde se utiliza"
          values={cultivoIds}
          onChange={setCultivoIds}
          options={(cultivos ?? []).map((c) => ({ value: c.id, label: c.nombre }))}
        />

        <MultiSelectPicker
          label="Plagas / ácaros / enfermedades / bacterias / malezas / nematodos objetivo"
          values={organismoIds}
          onChange={setOrganismoIds}
          options={(organismos ?? []).map((o) => ({ value: o.id, label: `${o.nombre} (${o.tipo})` }))}
        />

        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Observaciones técnicas</label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} spellCheck={false} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Riesgo de resistencia</label>
          <textarea value={riesgoResistencia} onChange={(e) => setRiesgoResistencia(e.target.value)} spellCheck={false} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Recomendación de rotación con otros grupos</label>
          <textarea value={recomendacionRotacion} onChange={(e) => setRecomendacionRotacion(e.target.value)} spellCheck={false} />
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Registro/uso en Argentina</label>
            <select value={registroArgentina} onChange={(e) => setRegistroArgentina(e.target.value)}>
              {REGISTRO_ARGENTINA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Fuente de la información</label>
            <input type="text" value={fuenteInformacion} onChange={(e) => setFuenteInformacion(e.target.value)} spellCheck={false} />
          </div>
          <div className="field">
            <label>Fecha de última verificación</label>
            <input type="date" value={fechaVerificacion} onChange={(e) => setFechaVerificacion(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
