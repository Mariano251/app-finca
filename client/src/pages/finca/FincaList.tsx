import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreate, useList } from "../../api/useCrud";
import type { Finca } from "../../api/types";
import { Modal } from "../../components/Modal";
import { RecordForm, type FieldSchema } from "../../components/RecordForm";

const fincaFields: FieldSchema[] = [
  { name: "nombre", label: "Nombre", type: "text", required: true },
  { name: "ubicacion", label: "Ubicación", type: "text" },
  { name: "superficieTotal", label: "Superficie total (ha)", type: "number", step: "0.01" },
  { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
];

export default function FincaList() {
  const { data: fincas, isLoading } = useList<Finca>("/fincas");
  const create = useCreate<Finca>("/fincas");
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <h1>Finca</h1>
        <button className="btn" onClick={() => setShowCreate(true)}>
          + Nueva finca
        </button>
      </div>

      {isLoading && <p className="text-muted">Cargando…</p>}
      {!isLoading && (fincas?.length ?? 0) === 0 && (
        <div className="card empty-state">Todavía no cargaste ninguna finca.</div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {fincas?.map((f) => {
          const superficieCuadros = (f.sectores ?? []).reduce(
            (sum, s) => sum + (s.cuadros?.reduce((s2, c) => s2 + (c.superficie ?? 0), 0) ?? 0),
            0
          );
          const cantCuadros = (f.sectores ?? []).reduce((n, s) => n + (s.cuadros?.length ?? 0), 0);
          const superficie = f.superficieTotal ?? superficieCuadros;
          return (
            <div className="card" key={f.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/finca/${f.id}`)}>
              <h3>{f.nombre}</h3>
              {f.ubicacion && <p className="text-muted">{f.ubicacion}</p>}
              <p style={{ fontSize: "0.85rem" }}>
                {(f.sectores ?? []).length} sector(es) · {cantCuadros} cuadro(s) · {superficie.toFixed(1)} ha
              </p>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <Modal title="Nueva finca" onClose={() => setShowCreate(false)}>
          <RecordForm
            fields={fincaFields}
            submitting={create.isPending}
            onCancel={() => setShowCreate(false)}
            onSubmit={(data) =>
              create.mutate(data as Partial<Finca>, {
                onSuccess: (f: Finca) => {
                  setShowCreate(false);
                  navigate(`/finca/${f.id}`);
                },
              })
            }
          />
        </Modal>
      )}
    </div>
  );
}
