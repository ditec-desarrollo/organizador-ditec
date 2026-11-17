# Organizador DITEC

Aplicación web interna de la Dirección de Innovación Tecnológica para organizar el trabajo del equipo. Un supervisor o administrador crea proyectos, suma integrantes y asigna tareas; cada colaborador consulta lo que tiene asignado, actualiza su avance y deja registradas las novedades.

## Qué permite hacer

- **Proyectos:** crearlos, editarlos y archivarlos, con sus integrantes, fechas, estado y avance general.
- **Tareas:** con responsable, prioridad, estado, fechas de inicio y vencimiento, y porcentaje de avance.
- **Tablero Kanban:** una columna por estado; las tarjetas se mueven arrastrándolas.
- **Seguimiento:** cada cambio de estado o de avance, novedad o dificultad queda en el historial de la tarea, con quién lo hizo y cuándo.
- **Comentarios** en cada tarea.
- **Notificaciones internas:** tarea asignada, modificada, comentada, próxima a vencer o con cambio de fecha.
- **Panel principal** según el rol: tareas pendientes, en progreso, vencidas y próximas a vencer, avance de los proyectos y actividad reciente.
- **Búsqueda y filtros** por proyecto, responsable, estado, prioridad y vencimiento.

## Roles

| Rol | Puede |
|---|---|
| Administrador | Todo: usuarios, proyectos, tareas y actividad de todo el equipo. |
| Supervisor | Crear proyectos y gestionar aquellos en los que es integrante: integrantes, tareas, asignaciones y seguimiento. |
| Colaborador | Ver los proyectos en los que participa, actualizar el estado y el avance de sus tareas, y comentar. |

El ingreso es con la cuenta de Ciudad Digital: la aplicación no tiene login propio ni guarda contraseñas.

## Tecnologías

| Parte | Tecnologías |
|---|---|
| Front (`front/`) | React 18, Vite, MUI, React Router, Axios, SweetAlert2, `@hello-pangea/dnd` (arrastrar y soltar). Diseño "Ciudad Digital" del repo UX-UI. |
| Back (`back/`) | Node.js, Express 5, API REST con JSON, `mysql2`, JSON Web Token, Helmet y CORS. |
| Base de datos | MySQL / MariaDB (`organizador_smt`). |

## Documentación

- [Arquitectura](docs/arquitectura.md): cómo está organizado el código, autenticación y seguridad.
- [Base de datos](docs/base-de-datos.md): diagrama entidad-relación, tablas y relaciones.
- [API](docs/api.md): endpoints y permisos por rol.

Desarrollado por la Dirección de Innovación Tecnológica — Municipalidad de San Miguel de Tucumán.
