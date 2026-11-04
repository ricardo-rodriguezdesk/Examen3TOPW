// Tipos de las respuestas CRUDAS del SII ITC, tal como llegan (con sus errores de escritura).
// Obtenidos de pruebas reales del 4 de noviembre de 2026.

export interface SiiLoginRespuesta {
  responseCodeTxt: string; // "200 OK" | "401 Unauthorized"
  message: { login: { token: string } } | null;
  status: number; // 200 | 401  (¡el HTTP siempre es 200!)
  flag: "success" | null;
  data: number;
  type?: string; // "estudiante"
}

export interface SiiEnvoltura<T> {
  code: number;
  message: string;
  flag: boolean;
  data: T;
}

export interface SiiEstudiante {
  numero_control: string;
  persona: string;
  email: string;
  semestre: number;
  num_mat_rep_no_acreditadas: string;
  creditos_acumulados: string;
  promedio_ponderado: string;
  promedio_aritmetico: string;
  materias_cursadas: string;
  materias_reprobadas: string;
  materias_aprobadas: string;
  creditos_complementarios: number;
  porcentaje_avance: number;
  num_materias_rep_primera: number | null;
  num_materias_rep_segunda: number | null;
  percentaje_avance_cursando: number; // (sic)
  foto: string | null;
}

export interface SiiPeriodo {
  clave_periodo: string; // "26/2"
  anio: number;
  descripcion_periodo: string; // "Agosto - Diciembre 2026"
}

export interface SiiCalificacionesPeriodo {
  periodo: SiiPeriodo;
  materias: {
    materia: {
      id_grupo: number;
      nombre_materia: string;
      clave_materia: string;
      letra_grupo: string;
    };
    calificaiones: { // (sic)
      id_calificacion: number;
      numero_calificacion: number;
      calificacion: string | null;
    }[];
  }[];
}

export interface SiiKardex {
  porcentaje_avance: number;
  kardex: {
    nombre_materia: string;
    clave_materia: string;
    periodo: string; // "21/2" | "23/V"
    creditos: string;
    calificacion: string; // "84" | "0" | "AC"
    descripcion: string; // "NORMAL / ORDINARIO" | "REPETICIÓN" | "CURSO ESPECIAL"
    semestre: number;
  }[];
}

type Dia = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado";

export type SiiHorarioMateria = {
  id_grupo: number;
  letra_grupo: string;
  nombre_materia: string;
  clave_materia: string;
  clave_turno: string;
  nombre_plan: string;
  letra_nivel: string;
} & { [K in Dia]: string | null } & { [K in `${Dia}_clave_salon`]: string | null };

export interface SiiHorarioPeriodo {
  periodo: SiiPeriodo;
  horario: SiiHorarioMateria[];
}
