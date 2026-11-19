-- Varios responsables por tarea y por proyecto, y menciones (@usuario) en los comentarios.
-- Ejecutar en la base organizador_smt (desarrollo y producción) con `npm run migrar`.
--
-- ATENCIÓN: quita la columna tarea.id_usuario_responsable. El back anterior a esta migración
-- deja de funcionar en todo lo que toque tareas: hay que publicar el back nuevo junto con ella.

-- ───────────── Varios responsables por tarea ─────────────
-- Relación muchos a muchos entre tarea y usuario (mismo patrón que proyecto_integrante).
-- Todos los responsables son iguales: cualquiera puede actualizar la tarea y todos reciben los avisos.
CREATE TABLE tarea_responsable (
  id_tarea_responsable  INT         NOT NULL AUTO_INCREMENT,
  id_tarea              INT         NOT NULL,
  id_usuario            INT         NOT NULL,
  habilita              TINYINT(1)  NOT NULL DEFAULT 1,
  id_usuario_alta       INT         NOT NULL,            -- quién lo asignó
  fecha_alta            DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion    DATETIME        NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_tarea_responsable),
  UNIQUE KEY uq_tarea_responsable (id_tarea, id_usuario),
  KEY idx_tarea_responsable_usuario (id_usuario, habilita),
  CONSTRAINT fk_tresponsable_tarea FOREIGN KEY (id_tarea) REFERENCES tarea (id_tarea),
  CONSTRAINT fk_tresponsable_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_tresponsable_usuario_alta FOREIGN KEY (id_usuario_alta) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Las asignaciones que ya existían pasan a la tabla nueva: no se pierde ninguna.
INSERT INTO tarea_responsable (id_tarea, id_usuario, id_usuario_alta, fecha_alta)
SELECT id_tarea, id_usuario_responsable, id_usuario_alta, fecha_alta
FROM tarea
WHERE id_usuario_responsable IS NOT NULL;

-- La columna vieja se elimina para que no queden dos lugares que digan quién es el responsable.
-- En dos pasos: primero la clave foránea y después el índice que la sostenía junto con la columna.
ALTER TABLE tarea
  DROP FOREIGN KEY fk_tarea_responsable;

ALTER TABLE tarea
  DROP INDEX idx_tarea_responsable,
  DROP COLUMN id_usuario_responsable;

-- ───────────── Responsables de proyecto ─────────────
-- Un responsable siempre es integrante, así que es un dato de esa relación. Es informativo:
-- los permisos siguen dependiendo del rol.
ALTER TABLE proyecto_integrante
  ADD COLUMN es_responsable TINYINT(1) NOT NULL DEFAULT 0 AFTER id_usuario;

-- En los proyectos que ya existen queda como responsable quien los creó.
UPDATE proyecto_integrante pi
INNER JOIN proyecto p ON p.id_proyecto = pi.id_proyecto AND p.id_usuario_alta = pi.id_usuario
SET pi.es_responsable = 1;

-- ───────────── Menciones en comentarios ─────────────
-- A quién se etiquetó en cada comentario. Va en tabla propia (y no solo dentro del texto)
-- para poder notificar y resaltar la mención sin interpretar el texto.
CREATE TABLE tarea_comentario_mencion (
  id_tarea_comentario_mencion  INT       NOT NULL AUTO_INCREMENT,
  id_tarea_comentario          INT       NOT NULL,
  id_usuario                   INT       NOT NULL,       -- usuario etiquetado
  fecha_alta                   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_tarea_comentario_mencion),
  UNIQUE KEY uq_tcomentario_mencion (id_tarea_comentario, id_usuario),
  KEY idx_tcomentario_mencion_usuario (id_usuario),
  CONSTRAINT fk_tcmencion_comentario FOREIGN KEY (id_tarea_comentario) REFERENCES tarea_comentario (id_tarea_comentario),
  CONSTRAINT fk_tcmencion_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tipo_notificacion (id_tnotificacion, nombre_tnotificacion) VALUES
  (7, 'Mención en un comentario');
