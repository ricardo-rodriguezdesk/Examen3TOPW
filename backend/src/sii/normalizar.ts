// Convierte las respuestas crudas del SII al contrato limpio de la app.
// Toda la "suciedad" del SII (números como texto, errores de escritura, nulls) se resuelve aquí.

import type {
  SiiCalificacionesPeriodo, SiiEstudiante, SiiHorarioPeriodo, SiiKardex, SiiPeriodo,
} from "./tipos-sii.js";
import type {
  BloqueHorario, CalificacionesActuales, Desempeno, DiaSemana, Estudiante, Horario,
  Kardex, MateriaKardex, Periodo, SemestreKardex, TipoCurso,
} from "./tipos-app.js";

const CALIF_MINIMA = 70; // mínima aprobatoria TecNM

const num = (v: unknown, def = 0): number => {
  if (v === null || v === undefined || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const redondear = (n: number, dec = 2) => Math.round(n * 10 ** dec) / 10 ** dec;
const promedio = (xs: number[]) => (xs.length ? redondear(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export function desempeno(calif: number | null): Desempeno {
  if (calif === null) return "sin_datos";
  if (calif >= 90) return "alto";
  if (calif >= CALIF_MINIMA) return "medio";
  return "bajo";
}

function periodo(p: SiiPeriodo | undefined): Periodo | null {
  if (!p) return null;
  return { clave: p.clave_periodo, anio: p.anio, descripcion: p.descripcion_periodo };
}

/** "21/2" → "Ago–Dic 2021", "22/1" → "Ene–Jun 2022", "23/V" → "Verano 2023" */
export function textoPeriodo(clave: string): string {
  const [aa, tipo] = clave.split("/");
  const anio = 2000 + num(aa);
  const t = (tipo ?? "").toUpperCase();
  if (t === "1") return `Ene–Jun ${anio}`;
  if (t === "2") return `Ago–Dic ${anio}`;
  if (t === "V" || t === "3") return `Verano ${anio}`;
  return clave;
}

/** Orden cronológico de periodos: 1 (ene-jun) < V (verano) < 2 (ago-dic) */
export function ordenPeriodo(clave: string): number {
  const [aa, tipo] = clave.split("/");
  const sub = { "1": 1, V: 2, "3": 2, "2": 3 }[(tipo ?? "").toUpperCase()] ?? 0;
  return num(aa) * 10 + sub;
}

function foto(v: string | null | undefined): string | null {
  if (!v) return null;
  if (v.startsWith("http") || v.startsWith("data:")) return v;
  return `data:image/jpeg;base64,${v}`; // el SII parece mandar base64 puro
}

// ---------------- Estudiante ----------------

export function normalizarEstudiante(e: SiiEstudiante): Estudiante {
  return {
    numeroControl: e.numero_control,
    nombre: e.persona?.trim() ?? "",
    email: e.email,
    semestre: num(e.semestre),
    foto: foto(e.foto),
    promedioPonderado: redondear(num(e.promedio_ponderado)),
    promedioAritmetico: redondear(num(e.promedio_aritmetico)),
    creditosAcumulados: num(e.creditos_acumulados),
    creditosComplementarios: num(e.creditos_complementarios),
    porcentajeAvance: num(e.porcentaje_avance),
    porcentajeAvanceCursando: num(e.percentaje_avance_cursando),
    materiasCursadas: num(e.materias_cursadas),
    materiasAprobadas: num(e.materias_aprobadas),
    materiasReprobadas: num(e.materias_reprobadas),
    materiasNoAcreditadasPendientes: num(e.num_mat_rep_no_acreditadas),
    materiasEnRepeticion: num(e.num_materias_rep_primera),
    materiasEnEspecial: num(e.num_materias_rep_segunda),
  };
}

// ---------------- Calificaciones ----------------

export function normalizarCalificaciones(data: SiiCalificacionesPeriodo[]): CalificacionesActuales {
  const actual = data?.[0];
  if (!actual) return { periodo: null, materias: [] };

  return {
    periodo: periodo(actual.periodo),
    materias: actual.materias.map(({ materia, calificaiones }) => {
      const unidades = (calificaiones ?? [])
        .map((c) => ({ numero: c.numero_calificacion, calificacion: c.calificacion === null ? null : num(c.calificacion) }))
        .sort((a, b) => a.numero - b.numero);
      const capturadas = unidades.filter((u) => u.calificacion !== null).map((u) => u.calificacion as number);
      const prom = promedio(capturadas);
      return {
        idGrupo: materia.id_grupo,
        clave: materia.clave_materia,
        nombre: materia.nombre_materia,
        grupo: materia.letra_grupo,
        unidades,
        unidadesCapturadas: capturadas.length,
        promedioActual: prom,
        desempeno: desempeno(prom),
      };
    }),
  };
}

// ---------------- Kardex ----------------

function tipoCurso(desc: string): TipoCurso {
  const d = desc.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  if (d.includes("ESPECIAL")) return "especial";
  if (d.includes("REPETICION")) return "repeticion";
  if (d.includes("ORDINARIO") || d.includes("NORMAL")) return "ordinario";
  return "otro";
}

export function normalizarKardex(k: SiiKardex): Kardex {
  const materias: MateriaKardex[] = (k.kardex ?? [])
    .map((m) => {
      const texto = (m.calificacion ?? "").trim().toUpperCase();
      const esAC = texto === "AC";
      const calif = esAC ? null : num(texto, 0);
      const acreditada = esAC || calif! >= CALIF_MINIMA;
      return {
        clave: m.clave_materia,
        nombre: m.nombre_materia,
        periodo: m.periodo,
        periodoTexto: textoPeriodo(m.periodo),
        creditos: num(m.creditos),
        calificacion: calif,
        textoCalificacion: esAC ? "AC" : acreditada ? String(calif) : "NA",
        acreditada,
        tipo: tipoCurso(m.descripcion ?? ""),
        tipoTexto: m.descripcion,
        semestre: num(m.semestre),
        desempeno: esAC ? "alto" : desempeno(calif),
      } satisfies MateriaKardex;
    })
    .sort((a, b) => a.semestre - b.semestre || ordenPeriodo(a.periodo) - ordenPeriodo(b.periodo));

  const porSemestre = new Map<number, MateriaKardex[]>();
  for (const m of materias) porSemestre.set(m.semestre, [...(porSemestre.get(m.semestre) ?? []), m]);

  const numericasAcreditadas = (ms: MateriaKardex[]) =>
    ms.filter((m) => m.acreditada && m.calificacion !== null).map((m) => m.calificacion as number);

  const semestres: SemestreKardex[] = [...porSemestre.entries()]
    .sort(([a], [b]) => a - b)
    .map(([semestre, ms]) => ({
      semestre,
      materias: ms,
      creditosAcreditados: ms.filter((m) => m.acreditada).reduce((s, m) => s + m.creditos, 0),
      promedio: promedio(numericasAcreditadas(ms)),
    }));

  const periodos = [...new Set(materias.map((m) => m.periodo))]
    .sort((a, b) => ordenPeriodo(a) - ordenPeriodo(b))
    .map((clave) => ({ clave, texto: textoPeriodo(clave) }));

  return {
    porcentajeAvance: num(k.porcentaje_avance),
    totalCreditosAcreditados: materias.filter((m) => m.acreditada).reduce((s, m) => s + m.creditos, 0),
    promedioGeneral: promedio(numericasAcreditadas(materias)),
    materias,
    semestres,
    periodos,
  };
}

// ---------------- Horario ----------------

const DIAS: DiaSemana[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.trim().split(":").map(Number);
  return h * 60 + (m || 0);
};

export function normalizarHorario(data: SiiHorarioPeriodo[]): Horario {
  const actual = data?.[0];
  if (!actual) return { periodo: null, materias: [], bloques: [], dias: [], horaInicio: 7, horaFin: 15 };

  const bloques: BloqueHorario[] = [];
  const materias = actual.horario.map((h, colorIndice) => {
    let minutos = 0;
    DIAS.forEach((dia, diaIndice) => {
      const rango = h[dia];
      if (!rango) return;
      // Un día podría traer varios rangos separados por coma o espacio: "07:00-08:00, 10:00-11:00"
      for (const parte of rango.split(/[,;\s]+/).filter(Boolean)) {
        const [ini, fin] = parte.split("-");
        if (!ini || !fin) continue;
        const inicioMin = aMinutos(ini);
        const finMin = aMinutos(fin);
        minutos += finMin - inicioMin;
        bloques.push({
          dia, diaIndice,
          inicio: ini.trim(), fin: fin.trim(), inicioMin, finMin,
          idGrupo: h.id_grupo, clave: h.clave_materia, nombre: h.nombre_materia, grupo: h.letra_grupo,
          salon: h[`${dia}_clave_salon`] ?? null,
          colorIndice,
        });
      }
    });
    return { idGrupo: h.id_grupo, clave: h.clave_materia, nombre: h.nombre_materia, grupo: h.letra_grupo, colorIndice, horasSemana: minutos / 60 };
  });

  bloques.sort((a, b) => a.diaIndice - b.diaIndice || a.inicioMin - b.inicioMin);
  const diasConClase = DIAS.filter((d) => bloques.some((b) => b.dia === d));
  // Siempre mostramos lunes a viernes; el sábado solo si hay clases
  const dias = DIAS.filter((d, i) => i < 5 || diasConClase.includes(d));

  return {
    periodo: periodo(actual.periodo),
    materias,
    bloques,
    dias,
    horaInicio: bloques.length ? Math.floor(Math.min(...bloques.map((b) => b.inicioMin)) / 60) : 7,
    horaFin: bloques.length ? Math.ceil(Math.max(...bloques.map((b) => b.finMin)) / 60) : 15,
  };
}
