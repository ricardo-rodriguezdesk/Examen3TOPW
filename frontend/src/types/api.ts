// CONTRATO con el backend. Copia de backend/src/sii/tipos-app.ts (+ tipos de auth al final).
// Si cambia, se cambia en los DOS lados en el mismo commit (ver CONTEXTO.md, sección 6).

export interface Periodo {
  clave: string; // "26/2"
  anio: number;
  descripcion: string; // "Agosto - Diciembre 2026"
}

export type Desempeno = "alto" | "medio" | "bajo" | "sin_datos"; // verde / amarillo / rojo / gris

export interface Estudiante {
  numeroControl: string;
  nombre: string;
  email: string;
  semestre: number;
  foto: string | null; // URL o data URL lista para <img src>
  promedioPonderado: number;
  promedioAritmetico: number;
  creditosAcumulados: number;
  creditosComplementarios: number;
  porcentajeAvance: number;
  porcentajeAvanceCursando: number;
  materiasCursadas: number;
  materiasAprobadas: number;
  materiasReprobadas: number;
  materiasNoAcreditadasPendientes: number;
  materiasEnRepeticion: number;
  materiasEnEspecial: number;
}

export interface MateriaEnCurso {
  idGrupo: number;
  clave: string;
  nombre: string;
  grupo: string;
  unidades: { numero: number; calificacion: number | null }[];
  unidadesCapturadas: number;
  promedioActual: number | null; // promedio de las unidades ya capturadas
  desempeno: Desempeno;
}

export interface CalificacionesActuales {
  periodo: Periodo | null;
  materias: MateriaEnCurso[];
}

export type TipoCurso = "ordinario" | "repeticion" | "especial" | "otro";

export interface MateriaKardex {
  clave: string;
  nombre: string;
  periodo: string; // "21/2"
  periodoTexto: string; // "Ago–Dic 2021"
  creditos: number;
  calificacion: number | null; // null cuando es "AC"
  textoCalificacion: string; // "84" | "AC" | "NA"
  acreditada: boolean;
  tipo: TipoCurso;
  tipoTexto: string; // texto original del SII
  semestre: number;
  desempeno: Desempeno;
}

export interface SemestreKardex {
  semestre: number;
  materias: MateriaKardex[];
  creditosAcreditados: number;
  promedio: number | null; // de materias acreditadas con calificación numérica
}

export interface Kardex {
  porcentajeAvance: number;
  totalCreditosAcreditados: number;
  promedioGeneral: number | null;
  materias: MateriaKardex[];
  semestres: SemestreKardex[];
  periodos: { clave: string; texto: string }[]; // para filtros
}

export type DiaSemana = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado";

export interface BloqueHorario {
  dia: DiaSemana;
  diaIndice: number; // 0 = lunes
  inicio: string; // "15:00"
  fin: string; // "17:00"
  inicioMin: number; // minutos desde 00:00, útil para dibujar la cuadrícula
  finMin: number;
  idGrupo: number;
  clave: string;
  nombre: string;
  grupo: string;
  salon: string | null;
  colorIndice: number; // misma materia = mismo color
}

export interface Horario {
  periodo: Periodo | null;
  materias: { idGrupo: number; clave: string; nombre: string; grupo: string; colorIndice: number; horasSemana: number }[];
  bloques: BloqueHorario[];
  dias: DiaSemana[]; // días que sí tienen clases
  horaInicio: number; // ej. 9  → primera fila de la cuadrícula
  horaFin: number; // ej. 17 → última fila
}

// ---------------- Autenticación y errores ----------------

export type CodigoError =
  | "CAMPOS_VACIOS" | "CREDENCIALES_INVALIDAS" | "SESION_REQUERIDA" | "SESION_EXPIRADA"
  | "SII_NO_DISPONIBLE" | "SII_RESPUESTA_INVALIDA" | "DEMASIADOS_INTENTOS" | "NO_ENCONTRADO" | "ERROR_INTERNO";

export interface RespuestaError { error: CodigoError; mensaje: string }
export interface Sesion { autenticado: boolean; expiraEn?: number }
