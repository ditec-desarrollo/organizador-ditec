# Organizador DITEC

Aplicación interna para gestionar proyectos y tareas del equipo: proyectos con integrantes, tareas con responsable, prioridad y vencimiento, tablero Kanban, seguimiento con historial, comentarios, notificaciones y un panel con el estado general.

- **Front:** React + Vite + MUI, con el diseño "Ciudad Digital" del repo UX-UI.
- **Back:** Node.js + Express, API REST.
- **Base:** MySQL (`organizador_smt`).
- **Login:** el de Ciudad Digital. La app recibe el token y no tiene pantalla de login propia.

## Documentación

| Documento | Contenido |
|---|---|
| [docs/arquitectura.md](docs/arquitectura.md) | Cómo está organizado el código, autenticación, seguridad y decisiones. |
| [docs/base-de-datos.md](docs/base-de-datos.md) | Diagrama entidad-relación, tablas, relaciones, índices y migraciones. |
| [docs/api.md](docs/api.md) | Endpoints, permisos por rol y formato de los pedidos. |

## Requisitos

- Node.js 20.19 o superior.
- MySQL 5.7+ o MariaDB 10.5+.
- La base `organizador_smt` creada en el **mismo servidor** que `ciudadano_digital`, con un usuario que tenga todos los permisos sobre `organizador_smt` y `SELECT` sobre `ciudadano_digital.persona`.
- La clave `JWT_SECRET_KEY` de Ciudad Digital.

## Instalación

### 1. Base de datos

Crear la base (una sola vez):

```sql
CREATE DATABASE organizador_smt CHARACTER SET utf8mb4;
```

### 2. Back

Instalar dependencias:

```bash
cd back
```

```bash
npm install
```

Copiar `.env.example` a `.env` y completar la conexión y la clave del token:

```bash
cp .env.example .env
```

Crear las tablas y cargar los catálogos:

```bash
npm run migrar
```

Dar de alta al primer administrador (la persona tiene que existir en Ciudad Digital):

```bash
npm run usuario:crear -- 20123456789 ADMINISTRADOR
```

Levantar la API en `http://localhost:4010`:

```bash
npm run dev
```

### 3. Front

Instalar dependencias:

```bash
cd front
```

```bash
npm install
```

Copiar `.env.example` a `.env` (apunta al back en `localhost:4010`):

```bash
cp .env.example .env
```

Levantar la app en `http://localhost:5173`:

```bash
npm run dev
```

### Entrar en desarrollo

La app necesita un token de Ciudad Digital. Iniciá sesión en Ciudad Digital y abrí la app con ese token:

```
http://localhost:5173/?auth=<token>
```

El token queda guardado en el navegador hasta que venza. Sin token, la app vuelve al portal de Ciudad Digital.

## Variables de entorno

### `back/.env`

| Variable | Descripción |
|---|---|
| `PORT` | Puerto de la API. Por defecto 4010. |
| `JWT_SECRET_KEY` | Clave con la que Ciudad Digital firma el token. |
| `HOST_ORGANIZADOR`, `PORT_ORGANIZADOR`, `USER_ORGANIZADOR`, `PASSWORD_ORGANIZADOR` | Conexión a MySQL. |
| `DB_ORGANIZADOR` | Nombre de la base. `organizador_smt`. |
| `DB_CIU_DIGITAL` | Nombre de la base de Ciudad Digital. `ciudadano_digital`. |
| `CORS_ORIGENES` | Orígenes del front habilitados, separados por coma. Vacío = solo `localhost`. |
| `DIAS_AVISO_VENCIMIENTO` | Con cuántos días de anticipación se avisa que una tarea vence. Por defecto 2. |

### `front/.env`

| Variable | Descripción |
|---|---|
| `VITE_APP_RUTA_BACK` | URL de la API. |
| `VITE_APP_URL_CIUDAD_DIGITAL` | Portal de Ciudad Digital, a donde se vuelve al cerrar sesión. |

Los `.env` no se suben al repo.

## Comandos

### Back

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta la API y la reinicia con cada cambio. |
| `npm start` | Levanta la API (producción). |
| `npm run migrar` | Aplica las migraciones pendientes. |
| `npm run migrar:estado` | Muestra cuáles están aplicadas y cuáles no. |
| `npm run usuario:crear -- <CUIL> <ROL>` | Da de alta un usuario (`ADMINISTRADOR`, `SUPERVISOR` o `COLABORADOR`). |
| `npm test` | Corre las pruebas que no necesitan base de datos. |
| `npm run test:integracion` | Prueba el flujo completo contra la base de `.env`. Solo para desarrollo: corre únicamente si no hay usuarios, proyectos ni tareas cargados, y borra lo que crea. |

### Front

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta la app en modo desarrollo. |
| `npm run build` | Genera `dist/` para publicar. |
| `npm run lint` | Revisa el código con ESLint. |

## Roles

| Rol | Puede |
|---|---|
| Administrador | Todo: usuarios, proyectos, tareas y actividad de todo el equipo. |
| Supervisor | Crear proyectos y gestionar aquellos en los que es integrante: integrantes, tareas, asignaciones y seguimiento. |
| Colaborador | Ver los proyectos en los que participa, actualizar el estado y el avance de sus tareas, y comentar. |

## Publicar

- **Back:** `npm install --omit=dev`, completar `.env` con los datos de producción (incluido `CORS_ORIGENES` con la URL del front), `npm run migrar` y `npm start`.
- **Front:** completar `.env` con la URL de la API y `npm run build`. El contenido de `dist/` se sirve como archivos estáticos (la app usa rutas con `#`, no necesita configuración del servidor web).
- En Ciudad Digital hay que registrar el Organizador como sistema externo para que lo abra con `?auth=<token>`.

Desarrollado por la Dirección de Innovación Tecnológica — Municipalidad de San Miguel de Tucumán.
