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

// La Biblioteca es un módulo grande (fichas, formularios con filas repetibles, comparador) que
// la mayoría de las visitas no toca — se separa del bundle inicial igual que Economía/Croquis.
const BibliotecaIndex = lazy(() => import("./pages/biblioteca/BibliotecaIndex"));
const BibliotecaBuscar = lazy(() => import("./pages/biblioteca/BibliotecaBuscar"));
const PrincipiosActivosList = lazy(() => import("./pages/biblioteca/PrincipiosActivosList"));
const PrincipioActivoFicha = lazy(() => import("./pages/biblioteca/PrincipioActivoFicha"));
const PrincipioActivoForm = lazy(() => import("./pages/biblioteca/PrincipioActivoForm"));
const ProductosComercialesList = lazy(() => import("./pages/biblioteca/ProductosComercialesList"));
const ProductoComercialFicha = lazy(() => import("./pages/biblioteca/ProductoComercialFicha"));
const ProductoComercialForm = lazy(() => import("./pages/biblioteca/ProductoComercialForm"));
const Comparador = lazy(() => import("./pages/biblioteca/Comparador"));
const ChequeoMezcla = lazy(() => import("./pages/biblioteca/ChequeoMezcla"));
const QuickAdd = lazy(() => import("./pages/QuickAdd"));

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
          <Route path="/biblioteca" element={<BibliotecaIndex />} />
          <Route path="/biblioteca/buscar" element={<BibliotecaBuscar />} />
          <Route path="/biblioteca/comparar" element={<Comparador />} />
          <Route path="/biblioteca/chequeo-mezcla" element={<ChequeoMezcla />} />
          <Route path="/carga-rapida" element={<QuickAdd />} />
          <Route path="/biblioteca/principios-activos" element={<PrincipiosActivosList />} />
          <Route path="/biblioteca/principios-activos/nuevo" element={<PrincipioActivoForm />} />
          <Route path="/biblioteca/principios-activos/:id" element={<PrincipioActivoFicha />} />
          <Route path="/biblioteca/principios-activos/:id/editar" element={<PrincipioActivoForm />} />
          <Route path="/biblioteca/productos" element={<ProductosComercialesList />} />
          <Route path="/biblioteca/productos/nuevo" element={<ProductoComercialForm />} />
          <Route path="/biblioteca/productos/:id" element={<ProductoComercialFicha />} />
          <Route path="/biblioteca/productos/:id/editar" element={<ProductoComercialForm />} />
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
