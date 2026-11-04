// Datos FICTICIOS con el mismo formato exacto que el SII real.
// Alumna inventada de Ingeniería en Sistemas Computacionales, 7.º semestre.

import type {
  SiiCalificacionesPeriodo, SiiEstudiante, SiiHorarioMateria, SiiHorarioPeriodo, SiiKardex,
} from "../tipos-sii.js";

type FilaKardex = [clave: string, nombre: string, creditos: number, semestre: number, periodo: string, calif: string, desc?: string];

const O = "NORMAL / ORDINARIO", R = "REPETICIÓN", E = "CURSO ESPECIAL";

const filas: FilaKardex[] = [
  ["ACF-0901", "CÁLCULO DIFERENCIAL", 5, 1, "23/2", "64"],
  ["AED-1285", "FUNDAMENTOS DE PROGRAMACIÓN", 5, 1, "23/2", "92"],
  ["ACC-0906", "FUNDAMENTOS DE INVESTIGACIÓN", 4, 1, "23/2", "88"],
  ["SCH-1024", "TALLER DE ADMINISTRACIÓN", 4, 1, "23/2", "85"],
  ["AEF-1041", "MATEMÁTICAS DISCRETAS", 5, 1, "23/2", "79"],
  ["ACA-0907", "TALLER DE ÉTICA", 4, 1, "23/2", "95"],
  ["ACF-0901", "CÁLCULO DIFERENCIAL", 5, 2, "24/1", "76", R],
  ["ACF-0902", "CÁLCULO INTEGRAL", 5, 2, "24/1", "81"],
  ["AED-1286", "PROGRAMACIÓN ORIENTADA A OBJETOS", 5, 2, "24/1", "94"],
  ["AEC-1008", "CONTABILIDAD FINANCIERA", 4, 2, "24/1", "87"],
  ["AEC-1058", "QUÍMICA", 4, 2, "24/1", "72"],
  ["ACF-0903", "ÁLGEBRA LINEAL", 5, 2, "24/1", "83"],
  ["AEF-1052", "PROBABILIDAD Y ESTADÍSTICA", 5, 2, "24/V", "90"],
  ["ACF-0904", "CÁLCULO VECTORIAL", 5, 3, "24/2", "0"],
  ["AED-1026", "ESTRUCTURA DE DATOS", 5, 3, "24/2", "96"],
  ["SCC-1005", "CULTURA EMPRESARIAL", 4, 3, "24/2", "89"],
  ["SCC-1013", "INVESTIGACIÓN DE OPERACIONES", 4, 3, "24/2", "78"],
  ["ACD-0908", "DESARROLLO SUSTENTABLE", 5, 3, "24/2", "91"],
  ["SCF-1006", "FÍSICA GENERAL", 5, 3, "24/2", "74"],
  ["ACF-0904", "CÁLCULO VECTORIAL", 5, 4, "25/1", "71", R],
  ["ACF-0905", "ECUACIONES DIFERENCIALES", 5, 4, "25/1", "0"],
  ["SCC-1017", "MÉTODOS NUMÉRICOS", 4, 4, "25/1", "80"],
  ["SCD-1027", "TÓPICOS AVANZADOS DE PROGRAMACIÓN", 5, 4, "25/1", "93"],
  ["AEF-1031", "FUNDAMENTOS DE BASE DE DATOS", 5, 4, "25/1", "90"],
  ["SCD-1018", "PRINCIPIOS ELÉCTRICOS Y APLICACIONES DIGITALES", 5, 4, "25/1", "77"],
  ["ACF-0905", "ECUACIONES DIFERENCIALES", 5, 5, "25/V", "0", R],
  ["SCC-1010", "GRAFICACIÓN", 4, 5, "25/2", "92"],
  ["AEC-1034", "FUNDAMENTOS DE TELECOMUNICACIONES", 4, 5, "25/2", "84"],
  ["AEC-1061", "SISTEMAS OPERATIVOS", 4, 5, "25/2", "86"],
  ["SCA-1025", "TALLER DE BASE DE DATOS", 4, 5, "25/2", "95"],
  ["SCC-1007", "FUNDAMENTOS DE INGENIERÍA DE SOFTWARE", 4, 5, "25/2", "88"],
  ["SCD-1003", "ARQUITECTURA DE COMPUTADORAS", 5, 5, "25/2", "79"],
  ["ACT-0000", "ACTIVIDADES COMPLEMENTARIAS", 5, 5, "25/2", "AC"],
  ["ACF-0905", "ECUACIONES DIFERENCIALES", 5, 6, "26/1", "75", E],
  ["SCD-1015", "LENGUAJES Y AUTÓMATAS I", 5, 6, "26/1", "82"],
  ["SCA-1026", "TALLER DE SISTEMAS OPERATIVOS", 4, 6, "26/1", "90"],
  ["SCB-1001", "ADMINISTRACIÓN DE BASES DE DATOS", 5, 6, "26/1", "91"],
  ["SCD-1021", "REDES DE COMPUTADORAS", 5, 6, "26/1", "85"],
  ["SCC-1014", "LENGUAJES DE INTERFAZ", 4, 6, "26/1", "80"],
  ["ACA-0909", "TALLER DE INVESTIGACIÓN I", 4, 6, "26/1", "93"],
];

export const kardexMock: SiiKardex = {
  porcentaje_avance: 58.46,
  kardex: filas.map(([clave, nombre, creditos, semestre, periodo, calif, desc]) => ({
    nombre_materia: nombre,
    clave_materia: clave,
    periodo,
    creditos: String(creditos),
    calificacion: calif,
    descripcion: desc ?? O,
    semestre,
  })),
};

export const estudianteMock: SiiEstudiante = {
  numero_control: "99030001",
  persona: "ANA SOFÍA DEMO TORRES",
  email: "l99030001@celaya.tecnm.mx",
  semestre: 7,
  num_mat_rep_no_acreditadas: "0",
  creditos_acumulados: "152",
  promedio_ponderado: "85.4210526315789",
  promedio_aritmetico: "78.1250000000000",
  materias_cursadas: "40",
  materias_reprobadas: "4",
  materias_aprobadas: "36",
  creditos_complementarios: 5,
  porcentaje_avance: 58,
  num_materias_rep_primera: 0,
  num_materias_rep_segunda: null,
  percentaje_avance_cursando: 70,
  foto: null,
};

const periodoActual = { clave_periodo: "26/2", anio: 2026, descripcion_periodo: "Agosto - Diciembre 2026" };

const enCurso: [id: number, clave: string, nombre: string, grupo: string, unidades: (string | null)[]][] = [
  [70101, "SCD-1016", "LENGUAJES Y AUTÓMATAS II", "A", ["88", "92", null, null]],
  [70102, "SCD-1004", "CONMUTACIÓN Y ENRUTAMIENTO EN REDES DE DATOS", "B", ["74", "68", null, null]],
  [70103, "SCC-1019", "PROGRAMACIÓN LÓGICA Y FUNCIONAL", "A", ["95", null, null, null]],
  [70104, "AEB-1055", "PROGRAMACIÓN WEB", "C", ["100", "97", "94", null]],
  [70105, "SCD-1011", "INGENIERÍA DE SOFTWARE", "A", ["62", "55", null, null]],
  [70106, "ACA-0910", "TALLER DE INVESTIGACIÓN II", "B", []],
];

let idCalif = 9000000;
export const calificacionesMock: SiiCalificacionesPeriodo[] = [{
  periodo: periodoActual,
  materias: enCurso.map(([id, clave, nombre, grupo, unidades]) => ({
    materia: { id_grupo: id, nombre_materia: nombre, clave_materia: clave, letra_grupo: grupo },
    calificaiones: unidades.map((c, i) => ({ id_calificacion: idCalif++, numero_calificacion: i + 1, calificacion: c })),
  })),
}];

type Dias = Partial<Record<"lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado", [string, string]>>;
const horario: [number, Dias][] = [
  [70101, { lunes: ["07:00-09:00", "LC1"], miercoles: ["07:00-09:00", "LC1"], viernes: ["07:00-08:00", "LC1"] }],
  [70102, { martes: ["09:00-11:00", "LR"], jueves: ["09:00-11:00", "LR"], viernes: ["08:00-09:00", "LR"] }],
  [70103, { lunes: ["09:00-11:00", "I4"], miercoles: ["09:00-11:00", "I4"] }],
  [70104, { martes: ["11:00-13:00", "LIS"], jueves: ["11:00-13:00", "LIS"], viernes: ["11:00-12:00", "LIS"] }],
  [70105, { lunes: ["11:00-13:00", "I2"], miercoles: ["11:00-12:00", "I2"], viernes: ["09:00-11:00", "I2"] }],
  [70106, { martes: ["13:00-15:00", "SALA2"], jueves: ["13:00-15:00", "SALA2"] }],
];

export const horariosMock: SiiHorarioPeriodo[] = [{
  periodo: periodoActual,
  horario: horario.map(([id, dias]) => {
    const m = enCurso.find((x) => x[0] === id)!;
    const fila: Record<string, unknown> = {
      id_grupo: id, letra_grupo: m[3], nombre_materia: m[2], clave_materia: m[1],
      clave_turno: "C.Celaya", nombre_plan: "INGENIERÍA EN SISTEMAS COMPUTACIONALES", letra_nivel: "L",
    };
    for (const d of ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const) {
      fila[d] = dias[d]?.[0] ?? null;
      fila[`${d}_clave_salon`] = dias[d]?.[1] ?? null;
    }
    return fila as SiiHorarioMateria;
  }),
}];
