# Organizador DITEC

Aplicación web interna de la Dirección de Innovación Tecnológica para organizar el trabajo del equipo. Un supervisor o administrador crea proyectos, suma integrantes y asigna tareas; cada colaborador consulta lo que tiene asignado, actualiza su avance y deja registradas las novedades.

## Qué permite hacer

- **Proyectos:** crearlos, editarlos y archivarlos, con sus integrantes y responsables, fechas, estado y avance general.
- **Tareas:** con uno o varios responsables, prioridad, estado, fechas de inicio y vencimiento, y porcentaje de avance.
- **Tablero Kanban:** una columna por estado; las tarjetas se mueven arrastrándolas. Las tareas finalizadas hace más de una semana dejan de mostrarse para que no se llene.
- **Historial:** todas las tareas finalizadas, para buscar por proyecto, persona o mes.
- **Seguimiento:** cada cambio de estado o de avance, novedad o dificultad queda en el historial de la tarea, con quién lo hizo y cuándo.
- **Comentarios** en cada tarea, con la posibilidad de etiquetar a otros usuarios con `@`.
- **Notificaciones internas:** tarea asignada, modificada, comentada, próxima a vencer o con cambio de fecha, y menciones. Las menciones también se avisan por email.
- **Panel principal** según el rol: tareas pendientes, en progreso, vencidas y próximas a vencer, avance de los proyectos y actividad reciente.
- **Búsqueda y filtros** por proyecto, responsable, estado, prioridad y vencimiento.
- **Commits que se cargan solos:** cada commit que hace Claude Code en un repositorio vinculado a un proyecto se registra como tarea de quien lo hizo. Ver [integraciones/claude-code](integraciones/claude-code/README.md).

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
