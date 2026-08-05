# Poner App Finca en la nube (acceso con datos móviles, siempre disponible)

Esta guía es para dejar la app funcionando en internet, sin depender de que tu PC esté prendida,
con todos los datos y fotos guardados de forma permanente. Se usan dos servicios gratuitos:

- **Supabase** → guarda la base de datos y las fotos.
- **Render** → mantiene la aplicación corriendo y accesible por una URL pública.

Ninguno de los dos te pide tarjeta para el plan gratuito. Vas a necesitar un email para cada uno
(podés usar el mismo).

---

## Paso 1 — Crear la base de datos en Supabase

1. Entrá a **https://supabase.com** → "Start your project" → creá una cuenta (podés usar tu cuenta
   de Google o GitHub para que sea más rápido).
2. Creá un proyecto nuevo:
   - Nombre: `app-finca` (o el que quieras).
   - **Database Password**: elegí una y **guardala en un lugar seguro** — la vas a necesitar en el
     paso siguiente y Supabase no te la vuelve a mostrar.
   - Región: la más cercana a Argentina (por ejemplo `South America (São Paulo)` si aparece, o la
     más cercana disponible).
3. Esperá 1-2 minutos a que el proyecto termine de crearse.
4. Andá a **Project Settings** (ícono de engranaje) → **Database**.
   - Buscá "Connection string" → pestaña **"Transaction pooler"**.
   - Copiá esa cadena (empieza con `postgresql://postgres...`) y reemplazá `[YOUR-PASSWORD]` por la
     contraseña que elegiste en el paso 2.
   - Guardá ese valor completo — es tu `DATABASE_URL`.
5. Andá a **Project Settings → API**.
   - Copiá el campo **URL** (algo como `https://xxxxx.supabase.co`) — es tu `SUPABASE_URL`.
   - Copiá el campo **service_role** (en "Project API keys" — es una clave larga, **no** la que
     dice "anon public") — es tu `SUPABASE_SERVICE_ROLE_KEY`. Esta clave es secreta, no la
     compartas ni la subas a ningún lado público.

## Paso 2 — Crear el lugar donde se guardan las fotos

1. En el menú de la izquierda de Supabase, andá a **Storage**.
2. Creá un bucket nuevo:
   - Nombre exacto: `finca-uploads` (tiene que ser ese nombre, tal cual).
   - Marcalo como **Public bucket** (activá el toggle).
3. Listo, no hace falta configurar nada más ahí.

## Paso 3 — Probar que todo funciona desde tu PC (opcional pero recomendado)

1. Abrí `server/.env` en el proyecto y completá los tres valores que copiaste:
   ```
   DATABASE_URL="postgresql://postgres...(lo que copiaste, con tu contraseña)"
   SUPABASE_URL="https://xxxxx.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
   ```
2. En una terminal:
   ```bash
   cd server
   npx prisma migrate dev --name init
   ```
   Esto crea todas las tablas en tu base de Supabase (una sola vez).
3. Corré la app normalmente (`npm run dev` en `server/` y en `client/`) y probá crear una finca,
   subir una foto de croquis, etc. Si la foto se ve y los datos quedan guardados, ya está todo
   conectado a la nube correctamente.

## Paso 4 — Crear cuenta en Render y subir el proyecto a GitHub

Render despliega la app leyendo el código desde un repositorio de GitHub.

1. Si no tenés cuenta de GitHub, creála en **https://github.com** (gratis).
2. Creá un repositorio nuevo, vacío (sin README) — por ejemplo `app-finca`. Copiá la URL que te da
   GitHub (algo como `https://github.com/tu-usuario/app-finca.git`).
3. Avisame la URL del repo (o pegala acá) y te ayudo a hacer el `git push` desde acá — vas a tener
   que iniciar sesión en GitHub cuando el sistema te lo pida (una ventana del navegador o un código
   para pegar en https://github.com/login/device).
4. Creá cuenta gratis en **https://render.com** (podés entrar directamente con tu cuenta de
   GitHub, es lo más simple).

## Paso 5 — Desplegar en Render

1. En el panel de Render → **New** → **Blueprint**.
2. Conectá tu cuenta de GitHub si te lo pide, y elegí el repositorio `app-finca`.
3. Render va a detectar el archivo `render.yaml` del proyecto y va a proponer crear el servicio
   `app-finca` automáticamente (plan gratuito).
4. Antes de confirmar, te va a pedir completar 3 variables de entorno — pegá ahí los mismos
   valores del Paso 1:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Confirmá. El primer despliegue tarda unos minutos (instala dependencias, compila, crea las
   tablas). Podés ver el progreso en la pestaña "Logs".
6. Cuando termine, Render te da una URL pública (algo como `https://app-finca.onrender.com`) —
   esa es la dirección de tu app, funciona desde cualquier lado con internet.

## Paso 6 — Probar desde el celular con datos móviles

1. Apagá el WiFi del celular (dejá solo datos móviles).
2. Entrá a la URL que te dio Render.
3. Si es la primera vez en un rato, puede tardar 30-60 segundos en cargar (el plan gratis "duerme"
   el servidor cuando nadie lo usa) — es normal, después responde rápido.
4. Para instalarla como app: menú del navegador → "Agregar a pantalla de inicio".

Si después de un rato de uso notás que tarda mucho en despertar y te molesta, se puede pasar a un
plan pago chico de Render (~7 USD/mes) que mantiene el servidor siempre encendido — avisame y lo
cambiamos.

## Cómo actualizar la app más adelante

Cualquier cambio que hagamos en el código, una vez que lo subas a GitHub (`git push`), Render lo
detecta solo y vuelve a desplegar automáticamente en unos minutos. No hace falta tocar nada más.

## Respaldo de datos

Los datos ahora viven en Supabase, no en tu PC. Supabase hace backups automáticos según el plan,
pero para más tranquilidad podés exportar la base manualmente desde Supabase → Database → Backups,
o pedirme que te arme un script de respaldo periódico más adelante.
