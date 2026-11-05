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

CREATE INDEX IF NOT EXISTS idx_materias_plan ON materias(plan_id);
CREATE INDEX IF NOT EXISTS idx_grupos_periodo ON grupos(periodo);
CREATE INDEX IF NOT EXISTS idx_bloques_grupo ON bloques(grupo_id);
`;
