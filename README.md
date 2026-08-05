# App Finca

Aplicación de gestión agrícola integral: fincas, sectores, cuadros, campañas, historial
agronómico completo, rendimiento, fitosanitarios, base de conocimiento, economía, dashboard y un
croquis editable de la finca.

Para dejarla funcionando en internet (accesible con datos móviles, sin depender de tu PC), ver
**[DEPLOY.md](./DEPLOY.md)**.

## Estructura

- `server/` — API (Node + Express + TypeScript + Prisma + PostgreSQL).
- `client/` — Frontend (React + TypeScript + Vite, instalable como PWA).

La base de datos y las fotos se guardan en la nube (Supabase — ver `DEPLOY.md`), no en archivos
locales del proyecto.

## Requisitos

- Node.js 20+ (probado con Node 24).
- Un proyecto de Supabase (base de datos Postgres + Storage) — ver `DEPLOY.md` Pasos 1 y 2. Sin
  esto la app no tiene dónde guardar los datos, ni siquiera en desarrollo local.

## Puesta en marcha (desarrollo)

1. Completá `server/.env` con las credenciales de Supabase (ver `server/.env.example` y
   `DEPLOY.md`).
2. En dos terminales:

```bash
# Terminal 1 — API
cd server
npm install
npx prisma migrate dev   # crea/actualiza las tablas en Postgres (solo la primera vez o tras cambiar el schema)
npx ts-node prisma/seed.ts  # opcional: carga datos de ejemplo
npm run dev               # http://localhost:3000
```

```bash
# Terminal 2 — Frontend
cd client
npm install
npm run dev               # http://localhost:5173 (proxy /api hacia el puerto 3000)
```

Abrí `http://localhost:5173` en el navegador de la PC.

## Acceder desde el celular

- **En cualquier momento, con datos móviles**: una vez desplegada en Render (ver `DEPLOY.md`),
  entrá directamente a la URL pública que te da Render.
- **Durante desarrollo, en la misma red WiFi que la PC**: con ambos servidores corriendo, en la PC
  corré `ipconfig` (PowerShell) para ver tu IP local (`192.168.x.x`), y desde el celular entrá a
  `http://<esa-IP>:5173`. Windows puede pedir permiso de red la primera vez — aceptá para redes
  privadas.
- Para "instalar" la app: menú del navegador (⋮ en Chrome/Android, compartir → en Safari/iOS) →
  "Agregar a pantalla de inicio".

## Producción local (un solo servidor sirviendo todo)

```bash
cd client && npm run build
cd ../server && npm run build && npm start   # sirve API + frontend en el puerto 3000
```

## Base de datos

PostgreSQL en Supabase (no en un archivo local). Para inspeccionarla visualmente desde tu PC:

```bash
cd server
npx prisma studio
```

Los backups los maneja Supabase — ver la sección correspondiente en `DEPLOY.md`.

## PWA / ícono de la app

Los íconos están en `client/public/icons/`, generados a partir de `client/scripts/icon-source.svg`
y `icon-source-maskable.svg`. Si querés cambiar el ícono, editá esos SVG y volvé a correr:

```bash
cd client
node scripts/generate-icons.mjs
```

El manifest y el service worker se configuran en `client/vite.config.ts` (plugin `VitePWA`). El
service worker cachea únicamente los archivos estáticos de la app (HTML/JS/CSS/íconos) — nunca
`/api/*` — para que los datos de la finca siempre se lean en vivo del servidor y nunca queden
desactualizados por el caché.
