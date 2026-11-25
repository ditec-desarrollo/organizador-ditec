-- Integración con git: cada commit que avisa el hook de Claude Code genera una tarea
-- (o registra una novedad en una tarea existente).
-- Ejecutar en la base organizador_smt (desarrollo y producción) con `npm run migrar`.
--
-- Solo agrega tablas: no modifica ninguna existente, así que el back anterior sigue funcionando.

-- ───────────── Repositorios de cada proyecto ─────────────
-- A qué proyecto va un commit. `repositorio` se guarda normalizado (utils/repositorio.js):
-- "github.com/ditec-desarrollo/gaf-backend", o el nombre de la carpeta si el repo no tiene remoto.
-- Un repositorio pertenece a un solo proyecto; un proyecto puede tener varios (back y front).
CREATE TABLE proyecto_repositorio (
  id_proyecto_repositorio  INT           NOT NULL AUTO_INCREMENT,
  id_proyecto              INT           NOT NULL,
  repositorio              VARCHAR(190)  NOT NULL,
  habilita                 TINYINT(1)    NOT NULL DEFAULT 1,
  id_usuario_alta          INT           NOT NULL,            -- quién lo vinculó
  fecha_alta               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion       DATETIME          NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_proyecto_repositorio),
  UNIQUE KEY uq_proyecto_repositorio (repositorio),
  KEY idx_proyecto_repositorio_proyecto (id_proyecto, habilita),
  CONSTRAINT fk_prepositorio_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyecto (id_proyecto),
  CONSTRAINT fk_prepositorio_usuario_alta FOREIGN KEY (id_usuario_alta) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ───────────── Identidades de git de cada usuario ─────────────
-- Con qué nombre o email firma sus commits cada usuario (una persona suele tener más de uno).
-- `alias` va en minúsculas. Un alias es de un solo usuario.
CREATE TABLE usuario_alias_git (
  id_usuario_alias_git  INT           NOT NULL AUTO_INCREMENT,
  id_usuario            INT           NOT NULL,
  alias                 VARCHAR(190)  NOT NULL,
  habilita              TINYINT(1)    NOT NULL DEFAULT 1,
  id_usuario_alta       INT           NOT NULL,              -- quién lo cargó
  fecha_alta            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion    DATETIME          NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario_alias_git),
  UNIQUE KEY uq_usuario_alias_git (alias),
  KEY idx_usuario_alias_git_usuario (id_usuario, habilita),
  CONSTRAINT fk_ualiasgit_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_ualiasgit_usuario_alta FOREIGN KEY (id_usuario_alta) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ───────────── Commits recibidos ─────────────
-- Una fila por commit que llegó a POST /integraciones/commits. Cumple tres funciones:
--   · no repetir: `commit_sha` es único, un reenvío no genera otra tarea;
--   · diagnóstico: `resultado` dice qué se hizo, o por qué quedó pendiente (falta vincular
--     el repositorio o el autor); los pendientes se pueden reprocesar;
--   · vínculo entre el commit y la tarea que generó o actualizó.
-- Guarda los datos tal como llegaron para poder reprocesar sin volver a pedirlos.
CREATE TABLE commit_recibido (
  id_commit_recibido  INT           NOT NULL AUTO_INCREMENT,
  commit_sha          CHAR(40)      NOT NULL,
  repositorio         VARCHAR(190)  NOT NULL,                -- normalizado
  carpeta             VARCHAR(190)      NULL,                -- nombre de la carpeta del repo, en minúsculas
  rama                VARCHAR(190)      NULL,
  autor_nombre        VARCHAR(190)      NULL,
  autor_email         VARCHAR(190)      NULL,
  autor_alias         VARCHAR(190)      NULL,                -- identidad fija de la máquina, si el hook la manda
  mensaje             TEXT          NOT NULL,
  fecha_commit        DATETIME          NULL,                -- hora local de quien hizo el commit
  resultado           VARCHAR(30)   NOT NULL,                -- ver RESULTADOS_COMMIT en utils/constantes.js
  id_proyecto         INT               NULL,
  id_usuario          INT               NULL,
  id_tarea            INT               NULL,
  fecha_alta          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion  DATETIME          NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_commit_recibido),
  UNIQUE KEY uq_commit_recibido_sha (commit_sha),
  KEY idx_commit_recibido_resultado (resultado, fecha_alta),
  KEY idx_commit_recibido_tarea (id_tarea),
  CONSTRAINT fk_crecibido_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyecto (id_proyecto),
  CONSTRAINT fk_crecibido_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_crecibido_tarea FOREIGN KEY (id_tarea) REFERENCES tarea (id_tarea)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
