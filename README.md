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
   ADMIN_EMAIL=admin@turnobarberya.com
   ADMIN_PASSWORD=<contraseña-inicial>
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
- **Barbero:** entrá por "Ingreso barbero" con email y contraseña y administrá la agenda (confirmar, completar, cancelar, eliminar), los horarios de atención, servicios, días bloqueados, cantidad de barberos/sillas y las credenciales en la pestaña **Configuración**.

La **cantidad de barberos (sillas)** se guarda en MongoDB y se aplica en todo el flujo: con 3 sillas se permiten hasta 3 reservas simultáneas para el mismo horario; el backend vuelve a validar la capacidad al confirmar cada reserva para evitar sobreventa y el frontend muestra la ocupación actual de cada horario.

> **Importante:** la contraseña se guarda como hash. Definí `ADMIN_EMAIL` y `ADMIN_PASSWORD` antes de crear la configuración inicial y usá HTTPS en producción.
