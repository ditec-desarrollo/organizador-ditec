-- Estructura inicial del Organizador (gestión de proyectos y tareas de DITEC).
-- Ejecutar en la base organizador_smt (desarrollo y producción) con `npm run migrar`.
--
-- Convenciones (las mismas que el resto de las bases de DITEC):
--   · tablas en español, singular y snake_case
--   · clave primaria id_<tabla>; catálogos con clave abreviada (id_tusuario, id_etarea…)
--   · borrado lógico con habilita (1/0)
--   · fecha_alta / fecha_modificacion en todas las tablas que se editan
--   · InnoDB + utf8mb4
--
-- Las personas (nombre, documento, email, clave) NO se guardan acá: viven en
-- ciudadano_digital.persona. usuario.id_persona apunta a esa tabla; no lleva FOREIGN KEY
-- porque es otra base.

-- ───────────────────────── Catálogos ─────────────────────────

CREATE TABLE tipo_usuario (
  id_tusuario      INT          NOT NULL AUTO_INCREMENT,
  nombre_tusuario  VARCHAR(50)  NOT NULL,
  habilita         TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id_tusuario),
  UNIQUE KEY uq_tipo_usuario_nombre (nombre_tusuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE estado_proyecto (
  id_eproyecto      INT          NOT NULL AUTO_INCREMENT,
  nombre_eproyecto  VARCHAR(50)  NOT NULL,
  orden             INT          NOT NULL DEFAULT 0,
  habilita          TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id_eproyecto),
  UNIQUE KEY uq_estado_proyecto_nombre (nombre_eproyecto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE estado_tarea (
  id_etarea      INT          NOT NULL AUTO_INCREMENT,
  nombre_etarea  VARCHAR(50)  NOT NULL,
  orden          INT          NOT NULL DEFAULT 0,   -- orden de las columnas del tablero
  es_final       TINYINT(1)   NOT NULL DEFAULT 0,   -- 1 = la tarea se considera terminada
  habilita       TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id_etarea),
  UNIQUE KEY uq_estado_tarea_nombre (nombre_etarea)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE prioridad (
  id_prioridad      INT          NOT NULL AUTO_INCREMENT,
  nombre_prioridad  VARCHAR(50)  NOT NULL,
  orden             INT          NOT NULL DEFAULT 0,   -- mayor = más urgente
  habilita          TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id_prioridad),
  UNIQUE KEY uq_prioridad_nombre (nombre_prioridad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tipo_actualizacion (
  id_tactualizacion      INT          NOT NULL AUTO_INCREMENT,
  nombre_tactualizacion  VARCHAR(50)  NOT NULL,
  habilita               TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id_tactualizacion),
  UNIQUE KEY uq_tipo_actualizacion_nombre (nombre_tactualizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tipo_notificacion (
  id_tnotificacion      INT          NOT NULL AUTO_INCREMENT,
  nombre_tnotificacion  VARCHAR(50)  NOT NULL,
  habilita              TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id_tnotificacion),
  UNIQUE KEY uq_tipo_notificacion_nombre (nombre_tnotificacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ───────────────────────── Usuarios ─────────────────────────

CREATE TABLE usuario (
  id_usuario          INT         NOT NULL AUTO_INCREMENT,
  id_persona          INT         NOT NULL,              -- ciudadano_digital.persona.id_persona
  id_tusuario         INT         NOT NULL,
  habilita            TINYINT(1)  NOT NULL DEFAULT 1,
  id_usuario_alta     INT             NULL,              -- quién lo dio de alta (NULL = alta inicial por script)
  fecha_alta          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion  DATETIME        NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuario_persona (id_persona),
  KEY idx_usuario_tusuario (id_tusuario),
  CONSTRAINT fk_usuario_tusuario FOREIGN KEY (id_tusuario) REFERENCES tipo_usuario (id_tusuario),
  CONSTRAINT fk_usuario_usuario_alta FOREIGN KEY (id_usuario_alta) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ───────────────────────── Proyectos ─────────────────────────

CREATE TABLE proyecto (
  id_proyecto         INT           NOT NULL AUTO_INCREMENT,
  nombre_proyecto     VARCHAR(150)  NOT NULL,
  descripcion         TEXT              NULL,
  fecha_inicio        DATE              NULL,
  fecha_fin_estimada  DATE              NULL,
  id_eproyecto        INT           NOT NULL,
  id_usuario_alta     INT           NOT NULL,            -- quién creó el proyecto
  archivado           TINYINT(1)    NOT NULL DEFAULT 0,
  fecha_archivado     DATETIME          NULL,
  habilita            TINYINT(1)    NOT NULL DEFAULT 1,
  fecha_alta          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion  DATETIME          NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_proyecto),
  KEY idx_proyecto_estado (id_eproyecto, archivado),
  KEY idx_proyecto_nombre (nombre_proyecto),
  CONSTRAINT fk_proyecto_eproyecto FOREIGN KEY (id_eproyecto) REFERENCES estado_proyecto (id_eproyecto),
  CONSTRAINT fk_proyecto_usuario_alta FOREIGN KEY (id_usuario_alta) REFERENCES usuario (id_usuario),
  CONSTRAINT chk_proyecto_fechas CHECK (fecha_fin_estimada IS NULL OR fecha_inicio IS NULL OR fecha_fin_estimada >= fecha_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Relación muchos a muchos entre proyecto y usuario.
-- Ser integrante es lo que da acceso al proyecto (y, si es supervisor, permiso para gestionarlo).
CREATE TABLE proyecto_integrante (
  id_proyecto_integrante  INT         NOT NULL AUTO_INCREMENT,
  id_proyecto             INT         NOT NULL,
  id_usuario              INT         NOT NULL,
  habilita                TINYINT(1)  NOT NULL DEFAULT 1,
  id_usuario_alta         INT         NOT NULL,
  fecha_alta              DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion      DATETIME        NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_proyecto_integrante),
  UNIQUE KEY uq_proyecto_integrante (id_proyecto, id_usuario),
  KEY idx_proyecto_integrante_usuario (id_usuario, habilita),
  CONSTRAINT fk_pintegrante_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyecto (id_proyecto),
  CONSTRAINT fk_pintegrante_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_pintegrante_usuario_alta FOREIGN KEY (id_usuario_alta) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ───────────────────────── Tareas ─────────────────────────

CREATE TABLE tarea (
  id_tarea                INT               NOT NULL AUTO_INCREMENT,
  id_proyecto             INT               NOT NULL,
  titulo                  VARCHAR(200)      NOT NULL,
  descripcion             TEXT                  NULL,
  id_usuario_responsable  INT                   NULL,    -- responsable principal (NULL = sin asignar)
  id_prioridad            INT               NOT NULL,
  id_etarea               INT               NOT NULL,
  porcentaje_avance       TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  fecha_inicio            DATE                  NULL,
  fecha_vencimiento       DATE                  NULL,
  fecha_finalizacion      DATETIME              NULL,    -- se completa sola al pasar a un estado final
  orden                   INT               NOT NULL DEFAULT 0,   -- posición de la tarjeta en su columna
  id_usuario_alta         INT               NOT NULL,    -- quién creó la tarea
  archivada               TINYINT(1)        NOT NULL DEFAULT 0,
  fecha_archivada         DATETIME              NULL,
  habilita                TINYINT(1)        NOT NULL DEFAULT 1,
  fecha_alta              DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion      DATETIME              NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_tarea),
  KEY idx_tarea_proyecto (id_proyecto, archivada, id_etarea),
  KEY idx_tarea_responsable (id_usuario_responsable, archivada, id_etarea),
  KEY idx_tarea_vencimiento (fecha_vencimiento),
  KEY idx_tarea_tablero (id_etarea, orden),
  KEY idx_tarea_prioridad (id_prioridad),
  CONSTRAINT fk_tarea_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyecto (id_proyecto),
  CONSTRAINT fk_tarea_responsable FOREIGN KEY (id_usuario_responsable) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_tarea_prioridad FOREIGN KEY (id_prioridad) REFERENCES prioridad (id_prioridad),
  CONSTRAINT fk_tarea_etarea FOREIGN KEY (id_etarea) REFERENCES estado_tarea (id_etarea),
  CONSTRAINT fk_tarea_usuario_alta FOREIGN KEY (id_usuario_alta) REFERENCES usuario (id_usuario),
  CONSTRAINT chk_tarea_porcentaje CHECK (porcentaje_avance <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Historial de seguimiento de la tarea. Solo se insertan filas: nunca se editan ni se borran,
-- así queda la evolución completa (quién, cuándo, de qué estado/porcentaje a cuál y por qué).
CREATE TABLE tarea_actualizacion (
  id_tarea_actualizacion  INT               NOT NULL AUTO_INCREMENT,
  id_tarea                INT               NOT NULL,
  id_usuario              INT               NOT NULL,
  id_tactualizacion       INT               NOT NULL,
  id_etarea_anterior      INT                   NULL,    -- los cuatro siguientes solo se completan si ese dato cambió
  id_etarea_nuevo         INT                   NULL,
  porcentaje_anterior     TINYINT UNSIGNED      NULL,
  porcentaje_nuevo        TINYINT UNSIGNED      NULL,
  comentario              TEXT                  NULL,
  fecha_alta              DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_tarea_actualizacion),
  KEY idx_tactualizacion_tarea (id_tarea, fecha_alta),
  KEY idx_tactualizacion_usuario (id_usuario),
  CONSTRAINT fk_tactualizacion_tarea FOREIGN KEY (id_tarea) REFERENCES tarea (id_tarea),
  CONSTRAINT fk_tactualizacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_tactualizacion_tipo FOREIGN KEY (id_tactualizacion) REFERENCES tipo_actualizacion (id_tactualizacion),
  CONSTRAINT fk_tactualizacion_etarea_ant FOREIGN KEY (id_etarea_anterior) REFERENCES estado_tarea (id_etarea),
  CONSTRAINT fk_tactualizacion_etarea_nvo FOREIGN KEY (id_etarea_nuevo) REFERENCES estado_tarea (id_etarea)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tarea_comentario (
  id_tarea_comentario  INT         NOT NULL AUTO_INCREMENT,
  id_tarea             INT         NOT NULL,
  id_usuario           INT         NOT NULL,
  comentario           TEXT        NOT NULL,
  habilita             TINYINT(1)  NOT NULL DEFAULT 1,
  fecha_alta           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion   DATETIME        NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_tarea_comentario),
  KEY idx_tcomentario_tarea (id_tarea, habilita, fecha_alta),
  CONSTRAINT fk_tcomentario_tarea FOREIGN KEY (id_tarea) REFERENCES tarea (id_tarea),
  CONSTRAINT fk_tcomentario_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ───────────────────────── Notificaciones y actividad ─────────────────────────

CREATE TABLE notificacion (
  id_notificacion    INT           NOT NULL AUTO_INCREMENT,
  id_usuario         INT           NOT NULL,             -- destinatario
  id_tnotificacion   INT           NOT NULL,
  id_tarea           INT               NULL,
  id_proyecto        INT               NULL,
  id_usuario_origen  INT               NULL,             -- quién la provocó (NULL = el sistema)
  texto              VARCHAR(255)  NOT NULL,
  fecha_referencia   DATE              NULL,             -- vencimiento avisado: evita repetir el aviso
  leida              TINYINT(1)    NOT NULL DEFAULT 0,
  fecha_lectura      DATETIME          NULL,
  fecha_alta         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_notificacion),
  KEY idx_notificacion_usuario (id_usuario, leida, fecha_alta),
  KEY idx_notificacion_aviso (id_tarea, id_usuario, id_tnotificacion, fecha_referencia),
  CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_notificacion_tipo FOREIGN KEY (id_tnotificacion) REFERENCES tipo_notificacion (id_tnotificacion),
  CONSTRAINT fk_notificacion_tarea FOREIGN KEY (id_tarea) REFERENCES tarea (id_tarea),
  CONSTRAINT fk_notificacion_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyecto (id_proyecto),
  CONSTRAINT fk_notificacion_origen FOREIGN KEY (id_usuario_origen) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bitácora general (actividad reciente del equipo). Solo inserciones.
CREATE TABLE registro_actividad (
  id_registro_actividad  INT           NOT NULL AUTO_INCREMENT,
  id_usuario             INT           NOT NULL,         -- quién hizo la acción
  accion                 VARCHAR(40)   NOT NULL,         -- código: TAREA_CREADA, PROYECTO_EDITADO…
  id_proyecto            INT               NULL,
  id_tarea               INT               NULL,
  descripcion            VARCHAR(255)  NOT NULL,         -- texto listo para mostrar
  fecha_alta             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_registro_actividad),
  KEY idx_ractividad_fecha (fecha_alta),
  KEY idx_ractividad_proyecto (id_proyecto, fecha_alta),
  KEY idx_ractividad_tarea (id_tarea, fecha_alta),
  KEY idx_ractividad_usuario (id_usuario, fecha_alta),
  CONSTRAINT fk_ractividad_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_ractividad_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyecto (id_proyecto),
  CONSTRAINT fk_ractividad_tarea FOREIGN KEY (id_tarea) REFERENCES tarea (id_tarea)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
