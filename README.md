# TurnoBarberYa 💈

Sistema web de turnos para barbería: los clientes reservan online y el barbero administra todo desde su panel.

## Producción

La app está desplegada con **Vercel** (frontend + API serverless) y **MongoDB Atlas**:

- **Web:** https://turnobarberya.vercel.app
- **Panel del barbero:** entrá desde la web al final de la página ("Ingreso barbero") o directamente en `/admin`.

En Vercel se configuran como variables de entorno: `MONGODB_URI` y `ADMIN_TOKEN` (el deploy local usa `server/.env`).

> **Importante:** el `ADMIN_TOKEN` y el MONGODB_URI fueron compartidos en un chat. Si el repositorio o el clúster son expuestos, **rotá ambos** (Vercel → Project Settings → Environment Variables, y Atlas → Database Access / Network Access).

## Estructura

- **Frontend:** React + Vite (`src/`) — página pública de reservas y panel del barbero.
- **Backend:** Node + Express + MongoDB (`server/`) — API REST que guarda turnos y configuración en MongoDB.

## Requisitos

- Node 18+
- Una base de datos MongoDB (Atlas o local)

## Configuración del backend

1. Entrá a `server/` y copiá las credenciales:

   ```
   cd server
  ```

2. Creá el archivo `server/.env` copiando `.env.example` y completá tu URI de MongoDB:

   ```
   MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/turnobarberya
   ADMIN_TOKEN=<token-secreto-para-el-panel>
   PORT=3001
   ```

3. Instalá dependencias y levantá la API:

   ```
   npm install
   npm start
   ```

La API queda escuchando en `http://localhost:3001`.

## Levantar la web (frontend)

En la raíz del proyecto:

```
npm install
npm run dev
```

Abrí `http://localhost:5173`.

## Uso

- **Clientes:** eligen servicio, día y hora, y dejan nombre y teléfono. El turno se guarda en la base de datos.
- **Barbero:** entrá por "Ingreso barbero" con el PIN (por defecto `1234`) y administrá la agenda (confirmar, completar, cancelar, eliminar), los horarios de atención, servicios, días bloqueados y el PIN en la pestaña **Configuración**.

> **Importante:** el PIN y el `ADMIN_TOKEN` son solo un control de acceso básico. Para producción, usá autenticación real (contraseñas con hash, HTTPS).