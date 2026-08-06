import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import "./index.css";
import App from "./App.tsx";
import { queryPersister } from "./offline/persister";
import { initSyncEngine } from "./offline/sync";

// Cuánto tiempo se sigue mostrando (y persistiendo) un dato ya cargado aunque no haya vuelto a
// pedirse con éxito. En el campo puede pasar más de un día sin señal, así que va largo: la
// prioridad es "mostrar algo" antes que forzar refetch. gcTime tiene que ser >= maxAge del
// persister o React Query descarta la query de memoria antes de poder persistirla.
const OFFLINE_CACHE_LIFETIME = 1000 * 60 * 60 * 24 * 7; // 7 días

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: OFFLINE_CACHE_LIFETIME,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: OFFLINE_CACHE_LIFETIME }}
      onSuccess={() => initSyncEngine(queryClient)}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>
);
