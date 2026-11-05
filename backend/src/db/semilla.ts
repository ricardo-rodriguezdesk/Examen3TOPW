// Datos iniciales del Planificador.
//
// RETÍCULA: OFICIAL, transcrita de los PDF del TecNM Celaya (Div. de Estudios Profesionales):
//   Ingeniería en Sistemas Computacionales ISIC-2010-224 (260 créditos) con las especialidades
//   - Inteligencia de Datos y Plataformas en la Nube (ISIE-IDP-2025-01)  → con su seriación completa
//   - Gestión de Tecnologías Emergentes (ISIE-GTE-2026-01)               → módulos (seriación por capturar)
// Las flechas horizontales del PDF son PRE-requisitos; las verticales, CO-requisitos.
//
// OFERTA DE GRUPOS: SIMULADA (el SII no publica la oferta). Se genera para el periodo 27/1.

import type { Db } from "./index.js";

type Tipo = "basica" | "especialidad" | "residencia" | "servicio" | "complementaria";
interface M {
  clave: string; nombre: string; htp: string; sem: number; tipo?: Tipo; pct?: number;
  pre?: string[]; co?: string[];
}

const TRONCO: M[] = [
  // 1er semestre
  { clave: "AEC-1058", nombre: "Química", htp: "2-2-4", sem: 1 },
  { clave: "AED-1285", nombre: "Fundamentos de Programación", htp: "2-3-5", sem: 1 },
  { clave: "AEF-1041", nombre: "Matemáticas Discretas", htp: "3-2-5", sem: 1 },
  { clave: "ACC-0906", nombre: "Fundamentos de Investigación", htp: "2-2-4", sem: 1 },
  { clave: "ACF-2301", nombre: "Cálculo Diferencial", htp: "3-2-5", sem: 1 },
  // 2do
  { clave: "AEC-1008", nombre: "Contabilidad Financiera", htp: "2-2-4", sem: 2 },
  { clave: "AED-1286", nombre: "Programación Orientada a Objetos", htp: "2-3-5", sem: 2, pre: ["AED-1285"] },
  { clave: "ACH-2307", nombre: "Taller de Ética", htp: "0-4-4", sem: 2 },
  { clave: "ACD-0908", nombre: "Desarrollo Sustentable", htp: "2-3-5", sem: 2 },
  { clave: "ACF-0902", nombre: "Cálculo Integral", htp: "3-2-5", sem: 2, pre: ["ACF-2301"] },
  { clave: "AEF-1052", nombre: "Probabilidad y Estadística", htp: "3-2-5", sem: 2, co: ["ACF-0902"] },
  // 3er
  { clave: "SCH-1024", nombre: "Taller de Administración", htp: "1-3-4", sem: 3 },
  { clave: "AED-1026", nombre: "Estructura de Datos", htp: "2-3-5", sem: 3, pre: ["AED-1286"] },
  { clave: "SCC-1005", nombre: "Cultura Empresarial", htp: "2-2-4", sem: 3 },
  { clave: "ACF-0903", nombre: "Álgebra Lineal", htp: "3-2-5", sem: 3, pre: ["ACF-2301"] },
  { clave: "ACF-0904", nombre: "Cálculo Vectorial", htp: "3-2-5", sem: 3, pre: ["ACF-0902"], co: ["ACF-0903"] },
  { clave: "SCF-1006", nombre: "Física General", htp: "3-2-5", sem: 3, co: ["ACF-0904"] },
  { clave: "SCC-1013", nombre: "Investigación de Operaciones", htp: "2-2-4", sem: 3, pre: ["ACF-0902", "AEF-1052"] },
  // 4to
  { clave: "SCD-1027", nombre: "Tópicos Avanzados de Programación", htp: "2-3-5", sem: 4, pre: ["AED-1026"] },
  { clave: "AEF-1031", nombre: "Fundamentos de Base de Datos", htp: "3-2-5", sem: 4, pre: ["AED-1026"] },
  { clave: "AEC-1061", nombre: "Sistemas Operativos", htp: "2-2-4", sem: 4, pre: ["AED-1026"] },
  { clave: "ACF-0905", nombre: "Ecuaciones Diferenciales", htp: "3-2-5", sem: 4, pre: ["ACF-0904"] },
  { clave: "SCC-1017", nombre: "Métodos Numéricos", htp: "2-2-4", sem: 4, co: ["ACF-0905"] },
  { clave: "SCD-1018", nombre: "Principios Eléctricos y Aplicaciones Digitales", htp: "2-3-5", sem: 4, pre: ["SCF-1006"] },
  { clave: "SCD-1022", nombre: "Simulación", htp: "2-3-5", sem: 4, pre: ["SCC-1013"] },
  // 5to
  { clave: "SCC-1007", nombre: "Fundamentos de Ingeniería de Software", htp: "2-2-4", sem: 5 },
  { clave: "SCA-1025", nombre: "Taller de Base de Datos", htp: "0-4-4", sem: 5, pre: ["AEF-1031"] },
  { clave: "SCA-1026", nombre: "Taller de Sistemas Operativos", htp: "0-4-4", sem: 5, pre: ["AEC-1061"] },
  { clave: "SCC-1010", nombre: "Graficación", htp: "2-2-4", sem: 5, pre: ["AED-1026", "ACF-0903"] },
  { clave: "SCC-1012", nombre: "Inteligencia Artificial", htp: "2-2-4", sem: 5, pct: 40 },
  { clave: "AEC-1034", nombre: "Fundamentos de Telecomunicaciones", htp: "2-2-4", sem: 5, pre: ["SCD-1018"] },
  { clave: "SCD-1003", nombre: "Arquitectura de Computadoras", htp: "2-3-5", sem: 5, pre: ["SCD-1018"] },
  // 6to
  { clave: "SCD-1011", nombre: "Ingeniería de Software", htp: "2-3-5", sem: 6, pre: ["SCC-1007"] },
  { clave: "SCB-1001", nombre: "Administración de Base de Datos", htp: "1-4-5", sem: 6, pre: ["SCA-1025"] },
  { clave: "AEB-1055", nombre: "Programación Web", htp: "1-4-5", sem: 6, pre: ["SCA-1025"] },
  { clave: "SCC-1019", nombre: "Programación Lógica y Funcional", htp: "2-2-4", sem: 6, pct: 50, pre: ["AED-1026"] },
  { clave: "SCD-1015", nombre: "Lenguajes y Autómatas I", htp: "2-3-5", sem: 6 },
  { clave: "SCD-1021", nombre: "Redes de Computadoras", htp: "2-3-5", sem: 6, pre: ["AEC-1034"] },
  { clave: "SCC-1014", nombre: "Lenguajes de Interfaz", htp: "2-2-4", sem: 6, pre: ["SCD-1003"] },
  // 7mo
  { clave: "SCG-1009", nombre: "Gestión de Proyectos de Software", htp: "3-3-6", sem: 7, pre: ["SCD-1011", "SCA-1025"] },
  { clave: "ACA-0909", nombre: "Taller de Investigación I", htp: "0-4-4", sem: 7, pct: 60 },
  { clave: "SCD-1016", nombre: "Lenguajes y Autómatas II", htp: "2-3-5", sem: 7, pre: ["SCD-1015"] },
  { clave: "SCD-1004", nombre: "Conmutación y Enrutamiento de Redes de Datos", htp: "2-3-5", sem: 7, pre: ["SCD-1021"] },
  { clave: "SCD-1023", nombre: "Sistemas Programables", htp: "2-2-4", sem: 7, pre: ["SCC-1014"] },
  // 8vo
  { clave: "ACA-0910", nombre: "Taller de Investigación II", htp: "0-4-4", sem: 8, pre: ["ACA-0909"] },
  { clave: "SCA-1002", nombre: "Administración de Redes", htp: "0-4-4", sem: 8, pre: ["SCD-1004", "SCA-1026"] },
  // Requisitos de egreso
  { clave: "ACT-0000", nombre: "Actividades Complementarias", htp: "0-0-5", sem: 7, tipo: "complementaria" },
  { clave: "SSO-0000", nombre: "Servicio Social", htp: "0-10-10", sem: 8, tipo: "servicio", pct: 70 },
  { clave: "RES-0000", nombre: "Residencias Profesionales", htp: "0-10-10", sem: 9, tipo: "residencia", pct: 80, pre: ["ACT-0000", "SSO-0000"] },
];

const ESPECIALIDADES: { clave: string; nombre: string; materias: M[] }[] = [
  {
    clave: "ISIE-IDP-2025-01",
    nombre: "Inteligencia de Datos y Plataformas en la Nube",
    materias: [
      { clave: "IDF-2505", nombre: "Inteligencia de Datos", htp: "3-2-5", sem: 7 },
      { clave: "IDD-2501", nombre: "Big Data", htp: "2-3-5", sem: 7, co: ["IDF-2505"] },
      { clave: "IDD-2504", nombre: "Tópicos Avanzados de Desarrollo Web", htp: "2-3-5", sem: 8, pct: 65, pre: ["AEB-1055"] },
      { clave: "IDD-2503", nombre: "Desarrollos Móviles y Servicios en la Nube", htp: "2-3-5", sem: 8, pct: 65, pre: ["IDD-2501"] },
      { clave: "IDD-2502", nombre: "Ciberseguridad", htp: "2-3-5", sem: 8, co: ["SCA-1002"] },
    ],
  },
  {
    clave: "ISIE-GTE-2026-01",
    nombre: "Gestión de Tecnologías Emergentes",
    materias: [
      { clave: "GTD-2601", nombre: "Inteligencia Artificial Generativa", htp: "2-3-5", sem: 7 },
      { clave: "GTD-2604", nombre: "Gestión de Tecnologías Emergentes", htp: "2-3-5", sem: 8 },
      { clave: "GTD-2605", nombre: "Tópicos Selectos de Herramientas Informáticas", htp: "2-3-5", sem: 8 },
      { clave: "GTD-2603", nombre: "Seminario de Comercialización de Tecnologías Computacionales", htp: "2-3-5", sem: 8 },
      { clave: "GTF-2602", nombre: "Aplicaciones de Realidad Virtual y Aumentada", htp: "3-2-5", sem: 8 },
    ],
  },
];

export const PERIODO_OFERTA = "27/1";

const DOCENTES = [
  "Mtra. Laura Méndez", "Ing. Jorge Salinas", "Dr. Ernesto Ruiz", "Mtra. Patricia Lozano", "Mtro. Raúl Ortega",
  "Dra. Claudia Herrera", "Ing. Miguel Ángel Vega", "Mtra. Sofía Navarro", "Mtro. Andrés Castillo", "Dra. Elena Ríos",
];
const SALONES = ["I1", "I2", "I3", "I4", "LC1", "LC2", "LIS", "LR", "LPA", "SALA2"];

const hhmm = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Patrón semanal según créditos: 4 → Mar/Jue 2h · 5 → Lun/Mié 2h + Vie 1h · 6 → Lun/Mié/Vie 2h */
function patron(creditos: number, inicio: number) {
  if (creditos <= 4) return [["martes", inicio, 2], ["jueves", inicio, 2]] as const;
  if (creditos === 5) return [["lunes", inicio, 2], ["miercoles", inicio, 2], ["viernes", inicio, 1]] as const;
  return [["lunes", inicio, 2], ["miercoles", inicio, 2], ["viernes", inicio, 2]] as const;
}

export async function sembrar(d: Db) {
  await d.transaccion(async (tx) => {
    const [plan] = await tx.query<{ id: number }>(
      "INSERT INTO planes (clave, nombre, creditos_totales) VALUES ($1,$2,$3) RETURNING id",
      ["ISIC-2010-224", "Ingeniería en Sistemas Computacionales", 260],
    );

    const ids = new Map<string, number>();
    const todas: { m: M; id: number }[] = [];

    async function insertar(m: M, especialidadId: number | null) {
      const [ht, hp, cr] = m.htp.split("-").map(Number);
      const [fila] = await tx.query<{ id: number }>(
        `INSERT INTO materias (plan_id, especialidad_id, clave, nombre, horas_teoria, horas_practica, creditos, semestre, tipo, porcentaje_requerido)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [plan.id, especialidadId, m.clave, m.nombre, ht, hp, cr, m.sem, m.tipo ?? (especialidadId ? "especialidad" : "basica"), m.pct ?? null],
      );
      ids.set(m.clave, fila.id);
      todas.push({ m, id: fila.id });
    }

    for (const m of TRONCO) await insertar(m, null);
    for (const e of ESPECIALIDADES) {
      const [esp] = await tx.query<{ id: number }>(
        "INSERT INTO especialidades (plan_id, clave, nombre) VALUES ($1,$2,$3) RETURNING id", [plan.id, e.clave, e.nombre],
      );
      for (const m of e.materias) await insertar(m, esp.id);
    }

    for (const { m, id } of todas) {
      for (const [tipo, lista] of [["pre", m.pre], ["co", m.co]] as const) {
        for (const clave of lista ?? []) {
          const req = ids.get(clave);
          if (!req) throw new Error(`Semilla: requisito ${clave} de ${m.clave} no existe`);
          await tx.query("INSERT INTO requisitos (materia_id, requisito_id, tipo) VALUES ($1,$2,$3)", [id, req, tipo]);
        }
      }
    }

    // Oferta simulada: 2 grupos por materia con clases (A matutino, B vespertino), horarios variados
    const conClases = todas.filter(({ m }) => !m.tipo || m.tipo === "basica" || m.tipo === "especialidad");
    let i = 0;
    for (const { m, id } of conClases) {
      const cr = Number(m.htp.split("-")[2]);
      const opciones = [
        { grupo: "A", inicio: [7, 9, 11][i % 3] },
        { grupo: "B", inicio: [13, 15, 17][(i + 1) % 3] },
      ];
      for (const [k, o] of opciones.entries()) {
        const [g] = await tx.query<{ id: number }>(
          "INSERT INTO grupos (materia_id, periodo, grupo, docente, cupo) VALUES ($1,$2,$3,$4,$5) RETURNING id",
          [id, PERIODO_OFERTA, o.grupo, DOCENTES[(i + k * 3) % DOCENTES.length], 25 + ((i * 7) % 11)],
        );
        const salon = SALONES[(i + k) % SALONES.length];
        for (const [dia, ini, horas] of patron(cr, o.inicio)) {
          await tx.query("INSERT INTO bloques (grupo_id, dia, inicio, fin, salon) VALUES ($1,$2,$3,$4,$5)", [g.id, dia, hhmm(ini), hhmm(ini + horas), salon]);
        }
      }
      i++;
    }
  });
}
