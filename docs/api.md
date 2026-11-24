# API del Organizador

API REST sobre HTTP y JSON. En desarrollo corre en `http://localhost:4010`.

## Reglas generales

- **Autenticación:** todas las rutas, salvo `GET /salud` y `POST /integraciones/commits` (que va con clave de integración, ver "Integración con git"), exigen el token de Ciudad Digital en la cabecera `Authorization` (tal cual, o con el prefijo `Bearer `). Sin token válido: `401 { "message": "Invalid token" }`.
- **Usuario habilitado:** salvo `GET /usuarios/authStatus`, además hay que ser usuario habilitado del Organizador. Si no: `403`.
- **Errores:** siempre `{ "message": "…" }`. Los errores de validación (`400`) agregan `errores` con un mensaje por campo:

  ```json
  { "message": "Hay datos inválidos o incompletos", "errores": { "titulo": "Este dato es obligatorio" } }
  ```

- **Fechas:** texto `AAAA-MM-DD` (fechas) o `AAAA-MM-DD HH:MM:SS` (fecha y hora), en la hora del servidor de base de datos.
- **Booleanos:** `1` / `0`.

| Código | Cuándo |
|---|---|
| 200 | Consulta o modificación correcta. |
| 201 | Se creó un recurso. |
| 400 | Datos inválidos o JSON mal formado. |
| 401 | Falta el token, venció o no es válido. |
| 403 | El usuario no tiene permiso para esa acción. |
| 404 | El recurso (o la ruta) no existe. |
| 409 | La acción choca con el estado actual (duplicado, proyecto archivado, integrante con tareas abiertas…). |
| 503 | No se pudo conectar con la base de datos. |
| 500 | Error inesperado. El detalle queda en el log del servidor, no en la respuesta. |

## Permisos

| Rol | Qué ve | Qué puede hacer |
|---|---|---|
| Administrador | Todo. | Todo, incluida la gestión de usuarios. |
| Supervisor | Los proyectos en los que es integrante. | Crear proyectos y gestionar (editar, archivar, integrantes, tareas) los proyectos en los que es integrante. |
| Colaborador | Los proyectos en los que es integrante. | Actualizar estado y avance de las tareas de las que es responsable, y comentar en las tareas de sus proyectos. |

"Gestor" en las tablas de abajo = administrador o supervisor integrante del proyecto.

Una tarea puede tener varios responsables y todos pueden actualizarla. Ser responsable de un proyecto es informativo: no da permisos.

## Sesión y datos generales

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /salud` | público | `{ "ok": true }`. Para monitoreo. |
| `GET /usuarios/authStatus` | token válido | `{ usuario }`: datos de la persona + `id_usuario`, `id_tusuario`, `nombre_tusuario`. Estos tres vienen en `null` si la persona no es usuaria habilitada del Organizador. |
| `GET /catalogos` | usuario | `{ tiposUsuario, estadosProyecto, estadosTarea, prioridades, tiposActualizacion, configuracion }`. `configuracion` trae `dias_aviso_vencimiento` y `dias_finalizadas_en_tablero`. |
| `GET /dashboard` | usuario | Panel según el rol (ver abajo). |
| `GET /actividad` | usuario | Actividad reciente de los proyectos visibles. Filtros: `id_proyecto`, `id_tarea`, `id_usuario`, `cantidad` (máx. 200, por defecto 30). |

`GET /dashboard` devuelve:

```json
{
  "vista": "equipo",
  "dias_proximas": 2,
  "resumen": {
    "total": 8, "pendientes": 3, "en_progreso": 2, "en_revision": 1, "bloqueadas": 1,
    "finalizadas": 1, "vencidas": 1, "proximas_a_vencer": 2, "proyectos_activos": 1
  },
  "proyectos": [],
  "tareas_vencidas": [],
  "tareas_proximas": [],
  "actividad": []
}
```

`vista` es `"equipo"` para administradores y supervisores (cuenta todas las tareas de los proyectos visibles) y `"personal"` para colaboradores (cuenta solo las tareas asignadas a ellos).

## Usuarios

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /usuarios` | admin, supervisor | Lista de usuarios. Filtro: `solo_habilitados=1`. |
| `GET /usuarios/etiquetables` | usuario | Lista mínima (`id_usuario`, `nombre_usuario`) de los usuarios habilitados, para etiquetar con `@` en los comentarios. |
| `GET /usuarios/persona/:documento` | admin | Busca una persona de Ciudad Digital por CUIL (11 números). Devuelve la persona + `ya_registrado`. |
| `POST /usuarios` | admin | Alta. Body: `{ id_persona, id_tusuario }`. |
| `PUT /usuarios/:id_usuario` | admin | Body: `{ id_tusuario, habilita }`. No permite dejar el sistema sin administradores habilitados (`409`). |
| `GET /usuarios/:id_usuario/alias-git` | admin | Identidades de git del usuario: `[{ id_usuario_alias_git, alias, fecha_alta }]`. |
| `POST /usuarios/:id_usuario/alias-git` | admin | Body: `{ alias }` (nombre o email con el que firma sus commits). `409` si ya es de otro usuario. Devuelve la lista. |
| `DELETE /usuarios/:id_usuario/alias-git/:id_usuario_alias_git` | admin | Quita el alias. Devuelve la lista. |

## Proyectos

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /proyectos` | usuario | Proyectos visibles, con resumen (`total_tareas`, `tareas_finalizadas`, `tareas_vencidas`, `avance`, `total_integrantes`, `nombres_responsables`). Filtros: `buscar`, `id_eproyecto`, `archivado` (por defecto `0`). |
| `POST /proyectos` | admin, supervisor | Crea el proyecto y suma a quien lo crea como integrante y responsable. |
| `GET /proyectos/:id_proyecto` | integrante | Detalle + `integrantes` + `repositorios` + `puede_gestionar`. |
| `PUT /proyectos/:id_proyecto` | gestor | Edita los datos. |
| `PATCH /proyectos/:id_proyecto/archivar` | gestor | Body: `{ archivado: 1 \| 0 }`. |
| `GET /proyectos/:id_proyecto/integrantes` | integrante | Integrantes con sus tareas abiertas y `es_responsable`. |
| `POST /proyectos/:id_proyecto/integrantes` | gestor | Body: `{ id_usuario }`. |
| `PATCH /proyectos/:id_proyecto/integrantes/:id_usuario` | gestor | Body: `{ es_responsable: 1 \| 0 }`. Marca o desmarca al integrante como responsable del proyecto. Puede haber varios. |
| `DELETE /proyectos/:id_proyecto/integrantes/:id_usuario` | gestor | Quita al integrante. `409` si tiene tareas sin finalizar en el proyecto. |
| `GET /proyectos/:id_proyecto/repositorios` | integrante | Repositorios de git vinculados: `[{ id_proyecto_repositorio, repositorio, fecha_alta }]`. |
| `POST /proyectos/:id_proyecto/repositorios` | gestor | Body: `{ repositorio }` (dirección de GitHub o nombre de carpeta; se guarda normalizado). `409` si ya está vinculado a un proyecto. Devuelve la lista. |
| `DELETE /proyectos/:id_proyecto/repositorios/:id_proyecto_repositorio` | gestor | Desvincula. Devuelve la lista. |

Body de `POST` y `PUT`:

```json
{
  "nombre_proyecto": "Portal de trámites",
  "descripcion": "Texto opcional",
  "fecha_inicio": "2026-11-01",
  "fecha_fin_estimada": "2027-01-15",
  "id_eproyecto": 2
}
```

Obligatorios: `nombre_proyecto` (3 a 150 caracteres) e `id_eproyecto`. La fecha de fin no puede ser anterior a la de inicio.

## Tareas

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /tareas` | usuario | Tareas de los proyectos visibles. Filtros abajo. |
| `POST /tareas` | gestor | Crea la tarea. Notifica a los responsables. |
| `GET /tareas/:id_tarea` | integrante | Detalle + `puede_gestionar` + `puede_actualizar`. |
| `PUT /tareas/:id_tarea` | gestor | Edita los datos generales y los responsables. |
| `PATCH /tareas/:id_tarea/archivar` | gestor | Body: `{ archivada: 1 \| 0 }`. |
| `PATCH /tareas/:id_tarea/mover` | gestor o un responsable | Drag and drop del tablero (ver abajo). |
| `GET /tareas/:id_tarea/actualizaciones` | integrante | Historial de seguimiento, de la más nueva a la más vieja. |
| `POST /tareas/:id_tarea/actualizaciones` | gestor o un responsable | Registra avance, estado, novedad o dificultad. |
| `GET /tareas/:id_tarea/comentarios` | integrante | Comentarios, del más viejo al más nuevo. Cada uno trae `menciones: [{ id_usuario, nombre_usuario }]`. |
| `POST /tareas/:id_tarea/comentarios` | integrante | Body: `{ comentario, ids_mencionados }`. Devuelve la lista actualizada. Ver "Menciones". |
| `DELETE /tareas/:id_tarea/comentarios/:id_tarea_comentario` | autor o admin | Borrado lógico. |

Filtros de `GET /tareas`:

| Parámetro | Descripción |
|---|---|
| `buscar` | Texto en el título de la tarea o el nombre del proyecto. |
| `id_proyecto`, `id_usuario_responsable`, `id_etarea`, `id_prioridad` | Por id. |
| `mias=1` | Solo las tareas asignadas al usuario de la sesión. |
| `sin_responsable=1` | Solo las que no tienen ningún responsable. |
| `vence_desde`, `vence_hasta` | Rango de fecha de vencimiento. |
| `vencimiento` | `vencidas` o `proximas` (vencen dentro de `DIAS_AVISO_VENCIMIENTO` días). |
| `archivada` | `1` para ver las archivadas (por defecto `0`). |
| `tablero=1` | Oculta las finalizadas hace más de `DIAS_FINALIZADAS_EN_TABLERO` días (lo usa el tablero). No modifica las tareas: siguen saliendo sin este parámetro. |
| `solo_finalizadas=1` | Solo las tareas en un estado final (lo usa el Historial). |
| `finalizada_desde`, `finalizada_hasta` | Rango de fecha de finalización. |
| `ordenar` | `tablero` (por defecto: estado y posición), `vencimiento` o `finalizacion` (de la más reciente a la más vieja). |
| `limite` | Máximo de filas (por defecto 1000, máx. 2000). |

Cada tarea trae, además de sus columnas: `nombre_proyecto`, `responsables` (lista de `{ id_usuario, nombre_usuario }`, vacía si está sin asignar), `nombre_prioridad`, `nombre_etarea`, `es_final`, `nombre_creador`, `vencida` (1/0) y `dias_para_vencer`.

Body de `POST /tareas`:

```json
{
  "id_proyecto": 1,
  "titulo": "Relevar los trámites más usados",
  "descripcion": "Texto opcional",
  "ids_responsables": [4, 9],
  "id_prioridad": 2,
  "id_etarea": 1,
  "fecha_inicio": "2026-11-18",
  "fecha_vencimiento": "2026-11-29"
}
```

Obligatorios: `id_proyecto`, `titulo` (3 a 200 caracteres) e `id_prioridad`. `ids_responsables` es opcional (sin responsables = sin asignar) y todos tienen que ser integrantes del proyecto. `PUT /tareas/:id_tarea` recibe lo mismo sin `id_proyecto` ni `id_etarea`: el estado y el avance solo cambian por `mover` o por una actualización, para que siempre queden en el historial.

Body de `POST /tareas/:id_tarea/actualizaciones`:

```json
{ "id_tactualizacion": 1, "id_etarea": 2, "porcentaje_avance": 60, "comentario": "Texto opcional" }
```

`id_tactualizacion` es 1 (avance), 2 (novedad) o 3 (dificultad); en los dos últimos el comentario es obligatorio. Si el estado es final, el avance queda en 100.

Body de `PATCH /tareas/:id_tarea/mover`:

```json
{ "id_etarea": 3, "ids_columna": [12, 7, 9] }
```

`id_etarea` es la columna de destino e `ids_columna` (opcional) la lista de tareas de esa columna tal como quedó en pantalla, de arriba hacia abajo, incluida la que se movió. Si el estado cambia, se registra en el historial como "Cambio de estado".

### Menciones

En el texto de un comentario se etiqueta con `@Nombre Apellido` y se mandan en `ids_mencionados` los `id_usuario` etiquetados:

```json
{ "comentario": "@Ana Prueba, ¿lo podés revisar?", "ids_mencionados": [4] }
```

- Solo cuenta un id si el nombre de ese usuario figura en el texto precedido por `@`. Los demás se ignoran.
- Se puede etiquetar a cualquier usuario habilitado. Si no es integrante del proyecto, se lo suma como integrante (queda registrado en la actividad quién lo sumó).
- El etiquetado recibe la notificación "Mención en un comentario" en lugar de la de "Nuevo comentario".

## Integración con git

El hook de Claude Code ([`integraciones/claude-code`](../integraciones/claude-code/README.md)) avisa cada commit y el back lo convierte en una tarea.

| Método y ruta | Quién | Descripción |
|---|---|---|
| `POST /integraciones/commits` | clave de integración | Recibe un commit. No lleva token: lleva la cabecera `X-Api-Key` con el valor de `INTEGRACION_API_KEY`. Sin clave o con otra: `401`. Si el back no tiene esa variable: `503`. |
| `GET /integraciones/commits` | admin | Commits recibidos, del más nuevo al más viejo, con `nombre_proyecto`, `nombre_usuario` y `titulo_tarea`. Filtros: `solo_pendientes=1`, `cantidad` (máx. 200, por defecto 50). |
| `POST /integraciones/commits/reprocesar` | admin | Vuelve a intentar con los pendientes. Devuelve `{ revisados, tareas_creadas, tareas_actualizadas, siguen_pendientes, con_error }`. |

Body de `POST /integraciones/commits`:

```json
{
  "commit_sha": "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
  "repositorio": "https://github.com/ditec-desarrollo/gaf-backend.git",
  "carpeta": "GAF-Back",
  "rama": "dev",
  "autor_nombre": "Nombre Apellido",
  "autor_email": "alguien@smt.gob.ar",
  "autor_alias": "nombre.apellido",
  "mensaje": "arreglos en roles y permisos de usuario",
  "fecha": "2026-11-24T10:15:30-03:00",
  "es_merge": false
}
```

Obligatorios: `commit_sha` (el hash completo), `repositorio` y `mensaje`. Responde `201` si creó una tarea y `200` en el resto de los casos:

```json
{
  "commit_sha": "a1b2c3d4…",
  "resultado": "TAREA_CREADA",
  "pendiente": false,
  "repetido": false,
  "id_proyecto": 3,
  "id_tarea": 41,
  "detalle": "Se creó la tarea #41"
}
```

| `resultado` | Qué pasó |
|---|---|
| `TAREA_CREADA` | Tarea nueva en el proyecto del repositorio: finalizada, prioridad media, a nombre del autor (creador y responsable). El título es la primera línea del mensaje. Si el autor no era integrante del proyecto, se lo suma. |
| `TAREA_ACTUALIZADA` | El mensaje decía `tarea #N`: se registró una novedad en esa tarea (y pasó a "En progreso" si estaba pendiente). Solo si la tarea es de ese proyecto y el autor la puede actualizar; si no, se crea una tarea nueva. |
| `IGNORADO_MERGE` | Es un merge: no genera nada. |
| `SIN_PROYECTO` | Pendiente: el repositorio no está vinculado a ningún proyecto. |
| `SIN_USUARIO` | Pendiente: el autor no corresponde a ningún usuario habilitado. |
| `PROYECTO_ARCHIVADO` | Pendiente: el proyecto está archivado. |

- **A qué proyecto va:** el que tenga vinculado el `repositorio` (se compara normalizado: sin protocolo, credenciales, `.git` ni mayúsculas) o, si no, la `carpeta`.
- **De quién es:** se busca `autor_alias`, `autor_email` y `autor_nombre`, en ese orden, entre los alias de git de los usuarios; si ninguno está cargado, vale el usuario cuyo email de Ciudad Digital sea `autor_email`.
- **No se repite:** el mismo `commit_sha` no genera otra tarea; la respuesta vuelve con `repetido: true`.
- **Pendientes:** quedan guardados y se vuelven a procesar solos al vincular un repositorio o cargar un alias, o con `reprocesar`.

## Notificaciones

Siempre son las del usuario de la sesión.

| Método y ruta | Descripción |
|---|---|
| `GET /notificaciones` | Lista, de la más nueva a la más vieja. Filtros: `solo_no_leidas=1`, `cantidad` (máx. 200, por defecto 50). |
| `GET /notificaciones/resumen` | `{ "no_leidas": 3 }`. |
| `PATCH /notificaciones/:id_notificacion/leida` | Marca una como leída. Devuelve el resumen. |
| `PATCH /notificaciones/leidas` | Marca todas como leídas. Devuelve el resumen. |

Cuándo se generan:

| Tipo | Cuándo | A quién |
|---|---|---|
| Tarea asignada | Al crear una tarea con responsables o al sumar uno. | A cada responsable nuevo. |
| Tarea modificada | Alguien que no es responsable editó la tarea o cambió su estado o avance; o se quitó a un responsable. | A los responsables y a quien creó la tarea (o al que se quitó). |
| Cambio de fecha de entrega | Cambió la fecha de vencimiento. | A los responsables. |
| Avance registrado | Un responsable cambió el estado o el avance, o informó una novedad. | A quien creó la tarea y a los demás responsables. |
| Nuevo comentario | Alguien comentó. | A los responsables y a quien creó la tarea. |
| Mención en un comentario | Alguien etiquetó a un usuario con `@`. | Al usuario etiquetado. |
| Próxima a vencer | Una tarea abierta vence dentro de `DIAS_AVISO_VENCIMIENTO` días o ya venció. Se revisa al arrancar el back y una vez por hora. | A cada responsable. |

Nunca se le notifica a quien hizo la acción.
