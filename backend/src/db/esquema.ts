// Esquema de la base de datos del Planificador (PostgreSQL).
// Idempotente: se puede ejecutar en cada arranque.

export const ESQUEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS planes (
  id                SERIAL PRIMARY KEY,
  clave             TEXT NOT NULL UNIQUE,          -- ISIC-2010-224
  nombre            TEXT NOT NULL,
  creditos_totales  INT  NOT NULL CHECK (creditos_totales > 0)
);

CREATE TABLE IF NOT EXISTS especialidades (
  id       SERIAL PRIMARY KEY,
  plan_id  INT  NOT NULL REFERENCES planes(id) ON DELETE CASCADE,
  clave    TEXT NOT NULL UNIQUE,                   -- ISIE-IDP-2025-01
  nombre   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS materias (
  id                    SERIAL PRIMARY KEY,
  plan_id               INT  NOT NULL REFERENCES planes(id) ON DELETE CASCADE,
  especialidad_id       INT  REFERENCES especialidades(id) ON DELETE CASCADE, -- NULL = tronco común
  clave                 TEXT NOT NULL,             -- AED-1026 (igual que en el kardex del SII)
  nombre                TEXT NOT NULL,
  horas_teoria          INT  NOT NULL DEFAULT 0,
  horas_practica        INT  NOT NULL DEFAULT 0,
  creditos              INT  NOT NULL CHECK (creditos >= 0),
  semestre              INT  NOT NULL CHECK (semestre BETWEEN 1 AND 12),
  tipo                  TEXT NOT NULL CHECK (tipo IN ('basica','especialidad','residencia','servicio','complementaria')),
  porcentaje_requerido  INT  CHECK (porcentaje_requerido BETWEEN 0 AND 100), -- "hasta cumplir el % de créditos"
  UNIQUE (plan_id, clave)
);

-- Seriación (flechas de la retícula):
--   tipo 'pre' (flecha horizontal) = hay que haber ACREDITADO requisito_id antes de cursar materia_id
--   tipo 'co'  (flecha vertical)   = co-requisito: se cursan juntas (o requisito_id ya acreditada)
CREATE TABLE IF NOT EXISTS requisitos (
  materia_id    INT NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  requisito_id  INT NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL DEFAULT 'pre' CHECK (tipo IN ('pre','co')),
  PRIMARY KEY (materia_id, requisito_id),
  CHECK (materia_id <> requisito_id)
);

-- Oferta de grupos (datos simulados del próximo periodo)
CREATE TABLE IF NOT EXISTS grupos (
  id          SERIAL PRIMARY KEY,
  materia_id  INT  NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  periodo     TEXT NOT NULL,                       -- 27/1
  grupo       TEXT NOT NULL,                       -- A
  docente     TEXT,
  cupo        INT  NOT NULL DEFAULT 30 CHECK (cupo >= 0),
  UNIQUE (materia_id, periodo, grupo)
);

CREATE TABLE IF NOT EXISTS bloques (
  id        SERIAL PRIMARY KEY,
  grupo_id  INT  NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  dia       TEXT NOT NULL CHECK (dia IN ('lunes','martes','miercoles','jueves','viernes','sabado')),
  inicio    TEXT NOT NULL CHECK (inicio ~ '^[0-2][0-9]:[0-5][0-9]$'),
  fin       TEXT NOT NULL CHECK (fin ~ '^[0-2][0-9]:[0-5][0-9]$'),
  salon     TEXT,
  CHECK (fin > inicio)
);

-- Horario que cada alumno PLANEA cursar (lo guarda desde el Generador).
-- Sirve para que la coordinación vea la DEMANDA de cada grupo.
-- Privacidad: no se guarda el número de control, sino un hash HMAC (no se puede revertir sin el secreto del servidor).
CREATE TABLE IF NOT EXISTS planes_alumno (
  id            SERIAL PRIMARY KEY,
  alumno_hash   TEXT NOT NULL,
  periodo       TEXT NOT NULL,                     -- 27/1
  especialidad  TEXT,                              -- clave de la especialidad con la que planeó
  semestre      INT,                               -- semestre del alumno al planear (para estadísticas)
  creditos      INT  NOT NULL DEFAULT 0,
  simulado      BOOLEAN NOT NULL DEFAULT FALSE,    -- datos de demostración generados por el sistema
  actualizado   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alumno_hash, periodo)
);

CREATE TABLE IF NOT EXISTS planes_alumno_grupos (
  plan_id   INT NOT NULL REFERENCES planes_alumno(id) ON DELETE CASCADE,
  grupo_id  INT NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, grupo_id)
);

CREATE INDEX IF NOT EXISTS idx_materias_plan ON materias(plan_id);
CREATE INDEX IF NOT EXISTS idx_planes_alumno_periodo ON planes_alumno(periodo);
CREATE INDEX IF NOT EXISTS idx_pag_grupo ON planes_alumno_grupos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_grupos_periodo ON grupos(periodo);
CREATE INDEX IF NOT EXISTS idx_bloques_grupo ON bloques(grupo_id);
`;
