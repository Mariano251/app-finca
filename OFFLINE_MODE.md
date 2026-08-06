# Prompt: hacer que App Finca funcione sin conexión (offline-first)

> Este archivo es un prompt para dar contexto y arrancar a trabajar. Pegalo entero como primer
> mensaje en una sesión nueva de Claude Code (o simplemente decí "leé OFFLINE_MODE.md y arrancá").

## Objetivo

Hoy App Finca es una PWA instalable, pero **necesita conexión a internet siempre**: el service
worker solo cachea archivos estáticos (HTML/JS/CSS/íconos) y todo lo que pega a `/api/*` y
`/uploads/*` está configurado como `NetworkOnly` (ver `client/vite.config.ts`). Sin señal, la app
abre pero las pantallas no muestran datos y no se puede cargar nada nuevo.

Se quiere que la app funcione **offline-first**:

1. Poder abrir la app sin conexión y ver los datos que ya se cargaron la última vez que hubo
   señal (fincas, cuadros, campañas, historial, etc.).
2. Poder cargar y editar datos sin conexión (por ejemplo, una labor cultural hecha a campo sin
   señal) y que la app los guarde localmente en el celular.
3. Cuando vuelve la conexión, que esos cambios se sincronicen solos con el servidor, sin que el
   usuario tenga que hacer nada manual.

## Contexto de la arquitectura actual

- **Cliente**: React + TypeScript + Vite, PWA vía `vite-plugin-pwa` (`client/vite.config.ts`).
  Todas las pantallas usan un layer de hooks genérico sobre TanStack Query
  (`client/src/api/useCrud.ts`: `useList`, `useOne`, `useCreate`, etc.) que pega a un cliente
  axios (`client/src/api/client.ts`, `baseURL: "/api"`). Las páginas están en
  `client/src/pages/**`.
- **Servidor**: Node + Express + TypeScript + Prisma + PostgreSQL (Supabase). Casi todos los
  recursos se sirven con un router CRUD genérico (`server/src/lib/crudRouter.ts`:
  `crudRouter` / `nestedCrudRouter`) montado en `server/src/routes/index.ts`. Ahí está la lista
  completa de recursos actuales — no la dupliques a mano en el diseño, leela de ese archivo
  porque puede cambiar.
- **Modelos**: ver `server/prisma/schema.prisma` (~24 modelos: Finca, Sector, Cuadro, Cultivo,
  Variedad, Campana, y varios "subregistros" anidados bajo Campana como LaborCultural,
  AplicacionFitosanitaria, Fertilizacion, Riego, Fenologia, EventoClimatico, Maleza, Enfermedad,
  Plaga, Comentario, Cosecha, Costo, Venta; más Insumo/MovimientoStock, Imagen, Croquis/
  CroquisPoligono).
- **Fotos**: se suben con `multer` (memoria, `server/src/lib/upload.ts`) y terminan en el bucket
  `finca-uploads` de Supabase Storage.
- **Caso especial — stock de insumos**: algunos recursos anidados (labores, aplicaciones,
  fertilizaciones) pueden llevar un `insumoId` + cantidad, y su create/update/delete corre en una
  transacción que también descuenta/revierte stock del `Insumo` relacionado (ver
  `sincronizarMovimientoDeStock` / `revertirMovimientosDeOrigen` en `crudRouter.ts` y
  `server/src/lib/stock.ts`). Esto es lo más delicado para el diseño offline: si dos dispositivos
  descuentan el mismo insumo sin conexión, el stock puede quedar mal. Hay que pensar
  explícitamente esta parte (por ejemplo: el stock final siempre lo recalcula el servidor al
  sincronizar, nunca se confía en el número que trae el cliente).
- El dashboard, economía, rendimiento y búsqueda (`server/src/routes/dashboard.ts`,
  `economia.ts`, `rendimiento.ts`, `busqueda.ts`) son vistas agregadas/calculadas, no CRUD directo
  — para offline alcanza con cachear su última respuesta como snapshot de solo lectura, no tienen
  sync de escritura.

## Enfoque técnico sugerido (no obligatorio, evaluar al arrancar)

- **Persistencia local**: IndexedDB en el cliente (por ejemplo con `dexie` o
  `idb-keyval`), reflejando los mismos recursos que hoy vienen de `/api/*`.
- **Cache de lectura offline**: usar el persister de TanStack Query
  (`@tanstack/query-persist-client-core` / `@tanstack/query-sync-storage-persister` o el
  equivalente para IndexedDB) para que las queries ya resueltas queden disponibles sin red, con un
  indicador visual de "datos de las [hora], sin conexión".
- **Cola de escritura offline**: las mutaciones (`useCreate`/`useUpdate`/delete) hechas sin
  conexión se guardan en una cola local con un id temporal (UUID o negativo) en vez de esperar el
  id autoincremental de Postgres. Al reconectar, se reproducen en orden contra el servidor y se
  reemplaza el id temporal por el real en todo lo que lo referenciaba localmente (por ejemplo, una
  labor creada offline dentro de una campaña creada offline).
- **Disparo de sync**: escuchar el evento `online` del navegador como mecanismo principal
  (funciona en todos lados, incluido iOS Safari, que no soporta la Background Sync API del service
  worker). Background Sync se puede sumar como mejora en Android/Chrome, no como único mecanismo.
- **Fotos offline**: guardar el blob localmente (IndexedDB) y subirlo recién cuando vuelva la
  conexión; mientras tanto mostrar la imagen desde el blob local.
- **Service worker**: cambiar el `runtimeCaching` de `/api/*` en `client/vite.config.ts` de
  `NetworkOnly` a una estrategia que sirva de la cache cuando no hay red (p. ej. `NetworkFirst` con
  cache de respaldo para los GET), manteniendo las escrituras fuera del service worker (las maneja
  la cola de la app, no workbox).

## Plan por fases (recomendado, ajustar si se ve mejor otro orden)

1. **Fase 1 — Solo lectura offline**: cachear las respuestas GET y mostrarlas sin conexión con un
   indicador de "sin conexión". Sin escritura offline todavía. Esto ya resuelve "ver el historial
   a campo sin señal".
2. **Fase 2 — Escritura offline para recursos simples**: Finca, Sector, Cuadro, Cultivo, Variedad,
   Insumo (CRUD plano, sin efectos secundarios de stock). Cola de mutaciones + remapeo de ids
   temporales.
3. **Fase 3 — Escritura offline para recursos anidados y con stock**: labores, aplicaciones,
   fertilizaciones, riegos, fenologías, eventos climáticos, malezas, enfermedades, plagas,
   comentarios, cosechas, costos, ventas. Acá se resuelve el tema del stock (recalculado
   server-side al sincronizar, no confiar en el cliente) y el orden de reproducción de la cola
   (una campaña creada offline tiene que sincronizarse antes que sus labores).
4. **Fase 4 — Fotos y croquis offline**, y pulido: indicador de estado de sync ("2 cambios
   pendientes de subir"), reintento manual, manejo de errores de sync (qué mostrarle al usuario si
   un cambio offline choca con algo que cambió en el servidor mientras tanto).

## Cómo probar

En Chrome DevTools → pestaña **Network** → activar **"Offline"** (más confiable que apagar el
WiFi real). Probar: abrir la app ya offline, navegar a pantallas con datos ya vistos, crear/editar
algo offline, volver a poner "Online" y confirmar que se sincroniza solo y sin duplicar datos.
También probar el flujo real en el celular con modo avión.

## Primeros pasos al arrancar esta sesión

1. Leer `server/src/routes/index.ts` y confirmar que la lista de recursos de este documento sigue
   vigente (puede haber cambiado).
2. Decidir la librería de persistencia local y de cola de sync, y dejarlo anotado antes de escribir
   código.
3. Armar la Fase 1 primero, probarla a fondo (offline real en el celular), y recién ahí seguir a
   Fase 2. No intentar las 4 fases en un solo cambio grande.
4. Trabajar en una rama aparte (no directo sobre `master`), dado que es un cambio grande que toca
   casi toda la capa de datos del cliente.

## Decisiones tomadas (2026-08-06)

- **Recursos**: la lista de `server/src/routes/index.ts` sigue vigente respecto a este documento
  (fincas, sectores, cuadros, cultivos, variedades, campañas, imágenes, croquis/polígonos,
  insumos/movimientos, y los 13 subregistros anidados bajo campaña). No hubo cambios a incorporar.
- **Rama**: `offline-first` (creada desde `master`).
- **Librería de persistencia local**: **Dexie**, una sola librería para todo en vez de mezclar
  `idb-keyval` + Dexie:
  - Fase 1: una tabla key-value chica en Dexie actúa como storage backend de
    `@tanstack/query-async-storage-persister` (+ `@tanstack/query-persist-client-core`), que
    persiste el cache completo de TanStack Query. Así, al abrir la app sin conexión (incluso
    después de cerrarla del todo), se rehidrata desde IndexedDB en vez de arrancar vacía.
  - Fases 2/3 (a futuro): las mismas tablas de Dexie se van a usar para la cola de mutaciones
    offline (con id temporal negativo/UUID y orden de reproducción) y, si hace falta, un mirror
    estructurado de recursos — reusar la misma librería evita tener dos motores de IndexedDB
    conviviendo.
- **Service worker**: por ahora NO se toca `client/vite.config.ts` (sigue `NetworkOnly` para
  `/api` y `/uploads`). El persister de TanStack Query ya resuelve el objetivo de Fase 1 (ver
  datos ya cargados sin señal) a nivel de la app, sin involucrar a workbox. Cambiar el
  `runtimeCaching` de `/api` se evalúa recién en las fases de escritura offline, donde de todas
  formas las mutaciones tienen que quedar afuera del service worker (las maneja la cola de la
  app).

## Progreso

- **Fase 1 (solo lectura offline) — hecha y probada**: `client/src/offline/{db,persister}.ts`,
  `PersistQueryClientProvider` en `main.tsx`, `OfflineBanner` con horario del dato más reciente.
  Probada de punta a punta con Playwright contra el build de producción (`vite preview` + service
  worker real): reload completo estando offline, la app sigue mostrando los últimos datos vistos.
- **Fase 2 (escritura offline para Finca/Sector/Cuadro/Cultivo/Variedad/Insumo) — hecha y
  probada**:
  - `client/src/offline/queue.ts`: cola de mutaciones en Dexie (tabla `mutations`), ids
    temporales negativos persistentes entre reloads, fusión de updates dentro de un create
    todavía no sincronizado, cancelación de un create+delete hechos offline sin haber sincronizado
    nunca (no le pega al server para nada que nunca llegó a existir ahí).
  - `client/src/offline/cachePatch.ts`: aplica el cambio al cache de TanStack Query al toque
    (create/update/delete), incluyendo los 3 anidamientos conocidos del modelo (Sector dentro de
    Finca, Cuadro dentro de Sector-dentro-de-Finca, Variedad dentro de Cultivo). Reemplaza el id
    temporal por el real en cache una vez que sincroniza.
  - `client/src/offline/sync.ts`: reproduce la cola en orden al volver la señal (evento `online` +
    intento al arrancar la app), remapeando ids temporales a reales en `targetId` y en cualquier
    campo del payload; si una mutación depende de otra que falló, se marca con error en vez de
    bloquear el resto de la cola; si se corta la conexión a mitad de la pasada, el resto queda
    pendiente para el próximo intento.
  - `useCreate`/`useUpdate`/`useDelete` (`client/src/api/useCrud.ts`) detectan error de
    conectividad (sin `response` de axios) y caen a la cola en vez de fallar — el resto de las
    ~20 páginas que usan estos hooks no se tocó, siguen funcionando igual online.
  - Indicador "N cambios pendientes de sincronizar" en `OfflineBanner`.
  - Probada de punta a punta con Playwright (bloqueando `/api/**` con `page.route`, más
    confiable que `context.setOffline()` contra `localhost`): crear+editar Finca offline con
    navegación por id temporal, crear Sector y Cuadro anidados, crear+borrar un Sector
    descartable sin sincronizar nunca, crear Cultivo+Variedad, crear Insumo (con default de
    servidor `stockActual` que el form no manda). Al reconectar sincronizó todo sin duplicados,
    con ids reales, y se limpiaron los datos de prueba contra la base real.
  - Dos bugs reales encontrados y corregidos durante la prueba: (1) el Insumo optimista no traía
    `stockActual` (default del server, no viene del form) y rompía `.toLocaleString()` en
    StockList/InsumoDetalle. (2) el parche de listas no hacía nada si la lista nunca había
    fetcheado con éxito (arranque en frío ya offline, sin nada persistido de Fase 1 todavía) — un
    create offline no aparecía en ninguna lista hasta sincronizar. Ambos corregidos en
    `cachePatch.ts`.
- **Fase 3 (subregistros de campaña + stock) — hecha y probada** para los 13 subregistros
  (labores, aplicaciones, fertilizaciones, riegos, fenologías, eventos climáticos, malezas,
  enfermedades, plagas, comentarios, cosechas, costos, ventas), con la salvedad de concurrencia
  entre dos dispositivos que se explica abajo:
  - Estos recursos **crean** vía `/campanas/:id/xxx` pero **editan/borran** vía `/xxx/:id` (dos
    resource strings distintos para el mismo dato — ver `server/src/routes/subregistros.ts` +
    `SubRecordTab.tsx`). Eso rompía el parche optimista de Fase 2 (patcheaba `/xxx`, que no lo
    muestra ninguna pantalla). Se generalizó `cachePatch.ts`/`queue.ts`/`sync.ts` con un parámetro
    `listResources` — dónde vive realmente el registro en cache — separado de `resource` (el path
    real del PUT/DELETE). Por default `listResources = [resource]`, así que Fase 2 no cambió en
    nada; `SubRecordTab.tsx` es el único lugar que pasa `listResources` explícito.
  - Probada de punta a punta con Playwright: Labor offline con insumo+cantidad (dispara descuento
    de stock), Riego offline creado y editado (edición vía resource distinto de la lista, el caso
    que rompía antes de generalizar), Comentario creado y borrado offline sin sincronizar nunca.
    Al reconectar: sin duplicados, stock del Insumo descontado server-side por el monto correcto,
    exactamente 1 `MovimientoStock` registrado.
  - **Bug real encontrado y corregido en el camino, preexistente y no relacionado con offline**:
    dejar el `<select>` "Estado" en blanco en el form de Labor/Aplicación (o "Estado" de Campaña)
    manda `estado: null` — Prisma rechaza un `null` explícito en un enum no-nullable con
    `@default` (el default solo aplica si la clave está ausente, no si es `null`), así que la
    creación fallaba **online también**, con o sin insumo. Se agregó `CrudOptions.dropNullFields`
    a `crudRouter.ts` (saca del payload los campos ahí listados si vienen en `null`) y se aplicó a
    `campanasRouter` y a `labores`/`aplicaciones` en `subregistros.ts`.
  - **Fuera de alcance a propósito**: creación offline de la Campaña misma (no está en la lista de
    este documento; su respuesta denormaliza `cultivo`/`variedad`/`cuadro`/`_count`, más trabajo de
    denormalización que el de Fase 2 y no pedido explícitamente) y Croquis/Polígonos (ya lo marca
    este documento como Fase 4).

- **Fase 4 (fotos, croquis, pulido) — hecha y probada**:
  - **Panel de sync** (`SyncPanel.tsx`, botón = el mismo banner de offline/sync): lista cada
    mutación pendiente en lenguaje simple (`describeMutation.ts`, ej. `Crear labor: "Fumigación
    lote 3"`), muestra el error real si quedó en estado `"error"`, permite **descartar** una en
    particular o **reintentar ahora** a mano. El `runSync` ya reprocesaba todo (pendientes y con
    error) en cada pasada, así que "reintentar" es simplemente `scheduleSync` de nuevo.
  - **Fotos offline** (`ImageAttachments.tsx`): si falla la subida por conexión, el archivo se
    guarda tal cual (`Blob`) en la misma tabla `mutations` de Dexie, se previsualiza al toque con
    `URL.createObjectURL`, y se sube como multipart recién al reconectar — ahí se reemplaza por la
    URL real de Supabase Storage y se libera el object URL local.
  - **Croquis y polígonos offline** (`Croquis.tsx`): crear el croquis, subir su imagen de fondo, y
    dibujar/editar/borrar polígonos funciona offline. Dos wrinkles propias de este recurso que no
    aparecían en Fase 2/3:
    1. Los polígonos se **crean** vía `/croquis/:id/poligonos` (id del croquis embebido en la URL,
       no en el payload) pero se **editan/borran** vía `/poligonos/:id` — a diferencia de los
       subregistros de campaña, acá el dato vive *embebido* en `croquis.poligonos[]`, no en una
       lista aparte, así que hizo falta sumar ese caso a `cachePatch.ts` (`POLIGONO_CREATE_PATH`)
       además del mecanismo de `listResources` de Fase 3.
    2. Si el croquis se crea offline, su id sigue siendo temporal cuando se dibuja un polígono en
       la misma sesión — el id temporal queda **embebido en la URL de creación** del polígono
       (`/croquis/-1/poligonos`), no en un campo del payload como en los demás casos. Se agregó
       `remapResourcePath` en `sync.ts`: al sincronizar, reemplaza cualquier segmento de la URL
       que sea un id temporal ya resuelto (y si no está resuelto todavía, la mutación se marca en
       espera en vez de mandarle basura al server).
  - **Bug real encontrado y corregido en el camino, no relacionado con offline pero agravado por
    Fase 4b/4c**: axios con el adapter XHR (el default en browser) se colgaba — nunca resolvía,
    sin error — al mandar un POST JSON inmediatamente después de un POST multipart en la misma
    página. Con `fetch()` crudo la misma secuencia andaba perfecto, así que el problema era
    específico del adapter XHR de axios. Esto podía afectar a usuarios reales también (ej.
    sincronizar una foto y después otro cambio quedaría trabado en silencio). Fix: `client.ts`
    ahora usa `adapter: "fetch"`. Se corrió toda la batería de tests de Fase 1/2/3/4b de nuevo
    después del cambio — todo sigue funcionando igual.
  - **Aviso de stock negativo**: `StockList`/`InsumoDetalle` muestran un tag "Stock negativo" (en
    vez de "Stock bajo") y, en el detalle, una explicación de que probablemente fue una carrera
    entre dos dispositivos offline — para que se note y se pueda corregir a mano con un
    movimiento de ajuste. No se bloquea nada ni se intenta resolver el conflicto solo: el server
    nunca confía en el stock que mande el cliente (ver Fase 3), así que la integridad del dato
    está a salvo — lo que faltaba era que se *note* cuando pasa, y eso ya está.
  - **Manejo de conflictos, en general**: se apoya en el panel de sync de arriba. Si una mutación
    encolada choca con algo que cambió en el server mientras tanto (ej. alguien borró desde otro
    dispositivo el registro que se estaba editando offline), el sync la deja en estado `"error"`
    con el mensaje real del server, sin bloquear el resto de la cola — el usuario la ve en el
    panel y decide si reintentar (por si el problema era otro) o descartar. No hay un merge/diff
    más fino todavía; es manejo de conflictos por notificación + descarte, no por resolución
    automática.
