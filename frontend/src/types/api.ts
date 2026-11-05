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
  | "SII_NO_DISPONIBLE" | "SII_RESPUESTA_INVALIDA" | "DEMASIADOS_INTENTOS" | "NO_ENCONTRADO"
  | "DATOS_INVALIDOS" | "CONFLICTO" | "ADMIN_REQUERIDO" | "ERROR_INTERNO";

export interface RespuestaError { error: CodigoError; mensaje: string }
export interface Sesion { autenticado: boolean; expiraEn?: number }

// ================= PLANIFICADOR (copia de backend/src/planificador/tipos.ts) =================

export type EstadoMateria = "aprobada" | "cursando" | "disponible" | "bloqueada" | "reprobada";
export type TipoMateria = "basica" | "especialidad" | "residencia" | "servicio" | "complementaria";

export interface MateriaAvance {
  clave: string;
  nombre: string;
  creditos: number;
  semestreSugerido: number;
  tipo: TipoMateria;
  requisitos: string[];            // pre-requisitos (claves)
  correquisitos: string[];         // co-requisitos: se cursan juntas
  porcentajeRequerido: number | null;
  estado: EstadoMateria;
  calificacion: number | null;
  intentos: number;
  requisitosPendientes: string[];
  faltaPorcentaje: boolean;
}

export interface Alerta { nivel: "info" | "advertencia" | "critica"; mensaje: string; clave?: string }

export interface AvancePlan {
  plan: { id: number; clave: string; nombre: string; creditosTotales: number };
  especialidad: { id: number; clave: string; nombre: string; detectada: boolean } | null;
  especialidades: { clave: string; nombre: string }[];
  materias: MateriaAvance[];
  resumen: {
    creditosAprobados: number; creditosCursando: number; creditosTotales: number; porcentaje: number;
    semestresCursados: number; semestresRestantesEstimados: number; egresoEstimado: string;
  };
  alertas: Alerta[];
}

export interface BloqueOferta { dia: DiaSemana; inicio: string; fin: string; salon: string | null }

export interface GrupoOferta {
  id: number; clave: string; nombre: string; creditos: number; grupo: string;
  docente: string | null; cupo: number; bloques: BloqueOferta[];
}

export interface Oferta { periodo: string | null; periodoTexto: string; grupos: GrupoOferta[] }

export interface Preferencias { turno?: "matutino" | "vespertino"; evitarSabado?: boolean; maxCreditos?: number }

export interface OpcionHorario {
  grupos: GrupoOferta[]; creditos: number; horasHueco: number; diasConClase: number;
  horaEntrada: string; horaSalida: string; puntuacion: number;
}

export interface OpcionesHorario {
  opciones: OpcionHorario[]; sinSolucion: string[];
  advertencias: string[]; // ya vienen con nombres de materia
  /** Solo si no hubo combinación con todas: qué materia quitar y cuántas opciones salen sin ella. */
  sugerencias?: { quitar: string; nombre: string; opciones: number }[];
  /** Solo si se pidió turno y no hubo combinación: opciones con cualquier turno. */
  opcionesSinTurno?: number;
}

// ================= ADMINISTRACIÓN =================

export interface SesionAdmin { autenticado: boolean; usuario?: string; expiraEn?: number }

export interface PlanAdmin {
  id: number; clave: string; nombre: string; creditosTotales: number; materias: number;
  especialidades: { id: number; clave: string; nombre: string; materias: number }[];
}

export interface MateriaAdmin {
  id: number; planId: number; especialidadId: number | null; clave: string; nombre: string;
  horasTeoria: number; horasPractica: number; creditos: number; semestre: number;
  tipo: TipoMateria; porcentajeRequerido: number | null;
  requisitos: { id: number; clave: string; nombre: string; tipo: "pre" | "co" }[];
}
/** Lo que se manda al crear/editar una materia */
export type MateriaAdminEntrada = Omit<MateriaAdmin, "id" | "requisitos"> & { requisitos: { id: number; tipo: "pre" | "co" }[] };

export interface GrupoAdmin {
  id: number; materiaId: number; clave: string; nombre: string; periodo: string; grupo: string;
  docente: string | null; cupo: number; bloques: BloqueOferta[];
}
export type GrupoAdminEntrada = Omit<GrupoAdmin, "id" | "clave" | "nombre">;
