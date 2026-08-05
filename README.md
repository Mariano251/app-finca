# App Finca

Aplicación de gestión agrícola integral: fincas, sectores, cuadros, campañas, historial
agronómico completo, rendimiento, fitosanitarios, base de conocimiento, economía, dashboard y un
croquis editable de la finca.

## Estructura

- `server/` — API (Node + Express + TypeScript + Prisma + SQLite).
- `client/` — Frontend (React + TypeScript + Vite, instalable como PWA).
- `uploads/` — Imágenes subidas (fotos de cultivos, croquis, etc.), servidas por el backend.

## Requisitos

- Node.js 20+ (probado con Node 24).

## Puesta en marcha (desarrollo)

En dos terminales:

```bash
# Terminal 1 — API
cd server
npm install
npx prisma migrate dev   # crea/actualiza la base SQLite (solo hace falta la primera vez o tras cambiar el schema)
npx ts-node prisma/seed.ts  # opcional: carga datos de ejemplo
npm run dev               # http://localhost:3000
```

```bash
# Terminal 2 — Frontend
cd client
npm install
npm run dev               # http://localhost:5173 (proxy /api y /uploads hacia el puerto 3000)
```

Abrí `http://localhost:5173` en el navegador de la PC.

## Acceder desde el celular (misma red WiFi)

1. Con ambos servidores corriendo (arriba), en la PC abrí PowerShell y corré `ipconfig`. Buscá la
   "Dirección IPv4" del adaptador WiFi activo (algo como `192.168.x.x`).
2. Windows puede pedir permiso para que Node.js acceda a la red la primera vez — aceptá para redes
   privadas.
3. Conectá el celular a la **misma red WiFi** que la PC.
4. En el navegador del celular, entrá a `http://<IP-de-la-PC>:5173` (durante desarrollo) o
   `http://<IP-de-la-PC>:3000` (con el build de producción corriendo, ver abajo).
5. Para "instalar" la app: menú del navegador (⋮ en Chrome/Android, compartir → en Safari/iOS) →
   "Agregar a pantalla de inicio" / "Instalar app". Usá siempre la versión de producción (puerto
   3000) para instalar — el service worker se comporta de forma más confiable ahí que en el dev
   server de Vite.

## Producción (un solo servidor sirviendo todo)

```bash
cd client && npm run build
cd ../server && npm run build && npm start   # http://<IP-de-la-PC>:3000 sirve API + frontend
```

Para probar la instalación como PWA desde el celular, usar siempre esta versión de producción (no
el dev server de Vite).

## Base de datos

SQLite en `server/dev.db`. Para inspeccionarla visualmente:

```bash
cd server
npx prisma studio
```

Para respaldar los datos, simplemente copiá `server/dev.db` (y la carpeta `uploads/` para las
fotos) a otro lugar.

## PWA / ícono de la app

Los íconos están en `client/public/icons/`, generados a partir de `client/scripts/icon-source.svg`
y `icon-source-maskable.svg`. Si querés cambiar el ícono, editá esos SVG y volvé a correr:

```bash
cd client
node scripts/generate-icons.mjs
```

El manifest y el service worker se configuran en `client/vite.config.ts` (plugin `VitePWA`). El
service worker cachea únicamente los archivos estáticos de la app (HTML/JS/CSS/íconos) — nunca
`/api/*` ni `/uploads/*` — para que los datos de la finca siempre se lean en vivo del servidor y
nunca queden desactualizados por el caché.
