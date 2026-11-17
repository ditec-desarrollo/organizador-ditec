-- Datos iniciales de los catálogos del Organizador.
-- Ejecutar en la base organizador_smt (desarrollo y producción) con `npm run migrar`.
--
-- Los ids están fijos porque el código los usa como constantes (back/utils/constantes.js).
-- Los usuarios NO se cargan acá: dependen de personas reales de ciudadano_digital.
-- Para el primer administrador y los usuarios de prueba: `npm run usuario:crear -- <CUIL> <ROL>`.

INSERT INTO tipo_usuario (id_tusuario, nombre_tusuario) VALUES
  (1, 'ADMINISTRADOR'),
  (2, 'SUPERVISOR'),
  (3, 'COLABORADOR');

INSERT INTO estado_proyecto (id_eproyecto, nombre_eproyecto, orden) VALUES
  (1, 'Planificación', 1),
  (2, 'Activo', 2),
  (3, 'Pausado', 3),
  (4, 'Finalizado', 4);

INSERT INTO estado_tarea (id_etarea, nombre_etarea, orden, es_final) VALUES
  (1, 'Pendiente', 1, 0),
  (2, 'En progreso', 2, 0),
  (3, 'En revisión', 3, 0),
  (4, 'Bloqueada', 4, 0),
  (5, 'Finalizada', 5, 1);

INSERT INTO prioridad (id_prioridad, nombre_prioridad, orden) VALUES
  (1, 'Baja', 1),
  (2, 'Media', 2),
  (3, 'Alta', 3),
  (4, 'Urgente', 4);

INSERT INTO tipo_actualizacion (id_tactualizacion, nombre_tactualizacion) VALUES
  (1, 'Avance'),
  (2, 'Novedad'),
  (3, 'Dificultad o bloqueo'),
  (4, 'Cambio de estado');

INSERT INTO tipo_notificacion (id_tnotificacion, nombre_tnotificacion) VALUES
  (1, 'Tarea asignada'),
  (2, 'Tarea modificada'),
  (3, 'Nuevo comentario'),
  (4, 'Próxima a vencer'),
  (5, 'Cambio de fecha de entrega'),
  (6, 'Avance registrado');
