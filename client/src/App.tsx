import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Busqueda from "./pages/Busqueda";
import FincaList from "./pages/finca/FincaList";
import FincaDetalle from "./pages/finca/FincaDetalle";
import CuadroDetalle from "./pages/finca/CuadroDetalle";
import Ajustes from "./pages/Ajustes";
import CampanaDetalle from "./pages/campana/CampanaDetalle";
import CultivoList from "./pages/cultivo/CultivoList";
import ConocimientoIndex from "./pages/conocimiento/ConocimientoIndex";
import ConocimientoDetalle from "./pages/conocimiento/ConocimientoDetalle";
import StockList from "./pages/stock/StockList";
import InsumoDetalle from "./pages/stock/InsumoDetalle";

// Code-split the heaviest pages (Konva canvas editor, recharts charts) so the initial bundle
// stays small — these pull in large libraries only needed once the user navigates there.
const CroquisPage = lazy(() => import("./pages/finca/Croquis"));
const CultivoDetalle = lazy(() => import("./pages/cultivo/CultivoDetalle"));
const Economia = lazy(() => import("./pages/Economia"));

function PageFallback() {
  return <p className="text-muted">Cargando…</p>;
}

function App() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/finca" element={<FincaList />} />
          <Route path="/finca/:id" element={<FincaDetalle />} />
          <Route path="/finca/:id/croquis" element={<CroquisPage />} />
          <Route path="/cuadros/:id" element={<CuadroDetalle />} />
          <Route path="/cuadros/:id/campanas/:campanaId" element={<CampanaDetalle />} />
          <Route path="/cultivos" element={<CultivoList />} />
          <Route path="/cultivos/:id" element={<CultivoDetalle />} />
          <Route path="/conocimiento" element={<ConocimientoIndex />} />
          <Route path="/conocimiento/:tipo/:nombre" element={<ConocimientoDetalle />} />
          <Route path="/busqueda" element={<Busqueda />} />
          <Route path="/economia" element={<Economia />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="/stock" element={<StockList />} />
          <Route path="/stock/:id" element={<InsumoDetalle />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
