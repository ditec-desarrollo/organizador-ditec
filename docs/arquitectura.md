# Arquitectura

El Organizador tiene tres partes separadas: un front en React, una API en Node.js + Express y una base MySQL. El front solo habla con la API (HTTP + JSON) y solo la API habla con la base.

```
Ciudad Digital ──(?auth=token)──► front (React)  ──HTTP/JSON──►  back (Express)  ──SQL──►  organizador_smt
   (login)                                                              │
                                                                        └──SELECT──►  ciudadano_digital.persona
```

## Autenticación

El Organizador no tiene login propio. Funciona como el resto de las apps internas de DITEC:

1. La persona inicia sesión en Ciudad Digital, que abre la app con `?auth=<token>`.
2. El front guarda el token en `localStorage` y lo saca de la URL ([`front/src/App.jsx`](../front/src/App.jsx)).
3. Cada pedido lleva el token en la cabecera `Authorization` ([`front/src/config/axios.js`](../front/src/config/axios.js)).
4. El back verifica la firma con `JWT_SECRET_KEY` (la misma clave que usa Ciudad Digital) y obtiene el `id_persona` ([`back/middlewares/auth.js`](../back/middlewares/auth.js)).
5. Con ese `id_persona` busca el usuario del Organizador y su rol ([`back/middlewares/verifyRole.js`](../back/middlewares/verifyRole.js)).
6. Si el token venció, el back responde `401 Invalid token` y el front vuelve al portal de Ciudad Digital.

Las contraseñas las guarda y valida Ciudad Digital; acá no se almacena ninguna.

## Back

```
back/
├─ index.js            arranca el servidor y el aviso de vencimientos
├─ app.js              arma la app: seguridad, CORS, rutas, manejo de errores
├─ config/             env.js (variables de entorno) y dbOrganizador.js (pool de conexiones)
├─ routes/             qué URL llama a qué controller y qué rol exige
├─ controllers/        leen el pedido, validan y responden; no tienen lógica de negocio
├─ validations/        validación de body y query de cada recurso
├─ services/           reglas de negocio y permisos
├─ repositories/       todo el SQL
├─ middlewares/        auth, verifyRole, manejoErrores
├─ jobs/               avisosDeVencimiento.js
├─ utils/              constantes, customError, validador
├─ migrations/         esquema versionado + migrar.js
├─ scripts/            crearUsuario.js
└─ test/               pruebas (node --test)
```

Un pedido recorre siempre las mismas capas:

| Capa | Responsabilidad | No hace |
|---|---|---|
| `routes` | URL, método y rol mínimo. | Lógica. |
| `controllers` | Validar la entrada y devolver la respuesta. | SQL ni reglas de negocio. |
| `validations` | Convertir el body o el query en datos limpios, o cortar con `400`. | Consultar la base. |
| `services` | Reglas de negocio, permisos, transacciones, notificaciones y bitácora. | SQL directo ni manejo de `req` / `res`. |
| `repositories` | Consultas SQL parametrizadas. | Decidir permisos. |

Puntos a tener en cuenta:

- **Permisos.** Las rutas filtran por rol (`soloAdmin`, `soloGestores`). Que el usuario además tenga acceso a ese proyecto o esa tarea lo decide [`services/permisosService.js`](../back/services/permisosService.js), que es el único lugar con esas reglas. Las listas se filtran en el SQL con [`repositories/visibilidad.js`](../back/repositories/visibilidad.js).
- **Errores.** Los services lanzan `CustomError(mensaje, códigoHTTP)` y [`middlewares/manejoErrores.js`](../back/middlewares/manejoErrores.js) arma la respuesta. Express 5 lleva hasta ahí cualquier error de una función `async`, así que los controllers no tienen `try/catch`.
- **Transacciones.** Toda operación que escribe en más de una tabla (por ejemplo: tarea + historial + bitácora + notificación) usa `enTransaccion`, para que se guarde todo o nada.
- **Seguimiento.** El estado y el avance de una tarea solo cambian por `aplicarSeguimiento` ([`services/tareasService.js`](../back/services/tareasService.js)), que en la misma transacción inserta la fila del historial. Así la tarea y su historial no pueden quedar desfasados.
- **Conexiones.** Un único pool (`config/dbOrganizador.js`). Los nombres siguen los de la casa: `conectarDBOrganizador`, `liberarConexion`.

### Seguridad

| Tema | Cómo se resuelve |
|---|---|
| Contraseñas | Las maneja Ciudad Digital (bcrypt). El Organizador no guarda ninguna. |
| Token | Se verifica la firma y el vencimiento en cada pedido. |
| Permisos | Se validan en el back en cada pedido; el front solo oculta lo que no corresponde. |
| SQL Injection | Todas las consultas son parametrizadas (`execute` con `?`). Lo único que se interpola (orden, `LIMIT`, nombre de la base de Ciudad Digital) sale de listas fijas o de enteros acotados, nunca del texto que manda el cliente. |
| Validación | Todo body y query pasa por `validations/` antes de llegar al service. |
| CORS | Solo los orígenes de `CORS_ORIGENES`. Si está vacío, solo `localhost`. |
| Cabeceras | `helmet`. |
| Credenciales | Solo en `.env`, que no se sube al repo. `config/env.js` corta el arranque si falta alguna. |
| Errores | Un error inesperado responde un mensaje genérico; el detalle queda en el log. |

## Front

```
front/src/
├─ main.jsx, App.jsx   arranque, token de Ciudad Digital y rutas
├─ theme/, styles/     tema MUI y tokens --cd-* (copiados de UX-UI) + organizador.css
├─ common/             NavBar, SideBar, alerta, marca, EncabezadoPagina (plantillas de UX-UI)
├─ layouts/            LayoutPrincipal
├─ routes/             PrivateRoute
├─ context/            sesión (UserContext) y datos compartidos (ProveedorDatos)
├─ hooks/              useConsulta, useTareas, useFiltrosTareas, useNotificaciones…
├─ services/           api.js: todas las llamadas a la API
├─ pages/              una por pantalla
├─ components/         por funcionalidad: proyectos, tareas, tablero, notificaciones, usuarios, ui
├─ config/             axios.js
└─ utils/              fechas, permisos, estados, avisos, opciones
```

- **Diseño.** Estilo "Ciudad Digital" del repo UX-UI. `theme/`, `styles/ciudadDigital.css`, `common/` y `components/Esqueletos/` son las plantillas de ese repo; lo único adaptado es `marca.js` (marca y menú) y una prop `acciones` en `NavBar.jsx` para la campana. Los estilos propios están en `styles/organizador.css` y solo usan los tokens `--cd-*`, así que todo responde al modo claro y oscuro.
- **Datos.** Cada pantalla pide sus datos con `useConsulta`, que resuelve carga, error y recarga. Cuando algo cambia (se movió una tarjeta, se guardó un formulario) se llama a `refrescar()` y todas las consultas en pantalla se vuelven a pedir.
- **Detalle de tarea.** Se abre con `?tarea=<id>` en la URL, así funciona desde cualquier pantalla y el link se puede compartir.
- **Tablero.** `@hello-pangea/dnd`. Al soltar una tarjeta se actualiza la pantalla al instante y se guarda en la base; si el back lo rechaza, la tarjeta vuelve a su lugar y se muestra el motivo.
- **Validación.** Los formularios validan antes de enviar con las mismas reglas que el back, y muestran en cada campo los errores que el back devuelva.

## Decisiones

| Decisión | Alternativa | Por qué |
|---|---|---|
| Login de Ciudad Digital | Login propio con usuario y contraseña | Es como funcionan todas las apps internas. Reutiliza personas, contraseñas y sesión, y evita guardar credenciales acá. |
| Un repo con `back/` y `front/` | Dos repos (`…Back` / `…Front`) | Hay un solo repositorio para el proyecto, y versionar juntos la API y quien la consume evita desfasajes. |
| Rutas REST (`PUT /tareas/12`) | Rutas con verbo, como en otros backs (`/tarea/editar/12`) | Fue un requisito del proyecto. |
| Capas `services` y `repositories` | Todo en el controller, como en otros backs | Separa reglas de negocio de SQL: se pueden cambiar o probar por separado, y los permisos quedan en un solo lugar. |
| Runner de migraciones propio | Correr los `.sql` a mano | El esquema queda versionado y se sabe qué se aplicó en cada base. Usa el mismo formato de archivo `.sql` fechado que LicitacionesBack, sin sumar un ORM. |
| Pool de conexiones | Una conexión por pedido | Reutiliza conexiones y permite transacciones. Es el criterio de cidituc-backend. |
| Validador propio (`utils/validador.js`) | `express-validator` | Son ~100 líneas, sin dependencia nueva, y devuelve los errores por campo que el front necesita. |
| `@hello-pangea/dnd` | `@dnd-kit` | Está hecha para listas y tableros tipo Kanban y trae accesibilidad por teclado. Ninguna app de la casa tenía drag and drop. |
| Notificaciones por consulta periódica | WebSockets | El front pregunta una vez por minuto cuántas hay sin leer. Alcanza para este uso y no suma infraestructura. |

## Cómo sumar una funcionalidad

1. Si cambia la base: un archivo nuevo en `back/migrations` y `npm run migrar`.
2. En el back: consulta en `repositories/`, regla en `services/`, validación en `validations/`, controller y ruta.
3. En el front: la llamada en `services/api.js`, el componente en `components/<funcionalidad>/` y, si es una pantalla nueva, la página en `pages/`, la ruta en `App.jsx` y el ítem en `common/marca.js`.
4. Documentar el endpoint en [`api.md`](api.md).
