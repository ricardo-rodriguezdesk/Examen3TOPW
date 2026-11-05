// Lógica PURA del Planificador (sin BD ni red): fácil de probar y de explicar en la exposición.
//
//  calcularAvance()   kardex + calificaciones + retícula → estado de cada materia, resumen y alertas
//  generarHorarios()  grupos ofertados + preferencias    → combinaciones sin choques, ordenadas

import type { CalificacionesActuales, DiaSemana, Estudiante, Kardex } from "../sii/tipos-app.js";
import { textoPeriodo } from "../sii/normalizar.js";
import type {
  Alerta, AvancePlan, EstadoMateria, GrupoOferta, MateriaAvance, OpcionesHorario, OpcionHorario, Preferencias, TipoMateria,
} from "./tipos.js";

// ---------- Datos de la retícula (como vienen de la BD) ----------

export interface MateriaReticula {
  id: number;
  clave: string;
  nombre: string;
  creditos: number;
  semestre: number;
  tipo: TipoMateria;
  porcentajeRequerido: number | null;
  especialidadId: number | null;
  pre: string[];
  co: string[];
}

export interface DatosReticula {
  plan: { id: number; clave: string; nombre: string; creditosTotales: number };
  especialidades: { id: number; clave: string; nombre: string }[];
  materias: MateriaReticula[];
}

export const LIMITE_SEMESTRES = 12;      // máximo reglamentario TecNM
export const MAX_CREDITOS_SEMESTRE = 36; // carga máxima reglamentaria TecNM

// ---------- Utilidades de periodos ----------

/** "26/2" + 1 → "27/1"  (solo periodos regulares; el verano no cuenta como semestre) */
export function sumarSemestres(clave: string, n: number): string {
  let [aa, t] = clave.split("/").map((x) => x.toUpperCase());
  let anio = Number(aa);
  let sub = t === "2" ? 2 : 1;
  for (let i = 0; i < n; i++) {
    if (sub === 1) sub = 2;
    else { sub = 1; anio++; }
  }
  return `${anio}/${sub}`;
}

// ---------- Avance ----------

export function calcularAvance(args: {
  reticula: DatosReticula;
  kardex: Kardex;
  calificaciones: CalificacionesActuales;
  estudiante: Estudiante;
  especialidadSolicitada?: string;
  especialidadPorDefecto: string;
}): AvancePlan {
  const { reticula, kardex, calificaciones, estudiante } = args;

  // 1. Historial por clave (cada intento cuenta)
  const historial = new Map<string, { intentos: number; acreditada: boolean; calificacion: number | null }>();
  for (const m of kardex.materias) {
    const h = historial.get(m.clave) ?? { intentos: 0, acreditada: false, calificacion: null };
    h.intentos++;
    if (m.acreditada) { h.acreditada = true; h.calificacion = m.calificacion; }
    historial.set(m.clave, h);
  }
  const cursando = new Set(calificaciones.materias.map((m) => m.clave));

  // 2. Especialidad: la que más claves comparte con el kardex/periodo actual
  const vistas = new Set([...historial.keys(), ...cursando]);
  const conteo = reticula.especialidades.map((e) => ({
    e, n: reticula.materias.filter((m) => m.especialidadId === e.id && vistas.has(m.clave)).length,
  })).sort((a, b) => b.n - a.n);
  const detectada = conteo[0]?.n ? conteo[0].e : null;
  const solicitada = reticula.especialidades.find((e) => e.clave === args.especialidadSolicitada);
  const especialidad = solicitada ?? detectada ?? reticula.especialidades.find((e) => e.clave === args.especialidadPorDefecto) ?? reticula.especialidades[0] ?? null;

  const delPlan = reticula.materias.filter((m) => m.especialidadId === null || m.especialidadId === especialidad?.id);

  // 3. Créditos y porcentaje (el SII es la fuente oficial de créditos acumulados)
  const total = reticula.plan.creditosTotales;
  const creditosAprobados = estudiante.creditosAcumulados;
  const porcentaje = Math.round((creditosAprobados / total) * 1000) / 10;

  const aprobada = (clave: string) => {
    if (clave === "ACT-0000" && estudiante.creditosComplementarios >= 5) return true;
    return historial.get(clave)?.acreditada ?? false;
  };

  // 4. Estado de cada materia
  const materias: MateriaAvance[] = delPlan.map((m) => {
    const h = historial.get(m.clave);
    const requisitosPendientes = m.pre.filter((r) => !aprobada(r));
    const faltaPorcentaje = m.porcentajeRequerido !== null && porcentaje < m.porcentajeRequerido;
    let estado: EstadoMateria;
    if (aprobada(m.clave)) estado = "aprobada";
    else if (cursando.has(m.clave)) estado = "cursando";
    else if (h && h.intentos > 0) estado = "reprobada";
    else if (requisitosPendientes.length || faltaPorcentaje) estado = "bloqueada";
    else estado = "disponible";

    return {
      clave: m.clave, nombre: m.nombre, creditos: m.creditos, semestreSugerido: m.semestre, tipo: m.tipo,
      requisitos: m.pre, correquisitos: m.co, porcentajeRequerido: m.porcentajeRequerido,
      estado, calificacion: estado === "aprobada" ? (h?.calificacion ?? null) : null,
      intentos: h?.intentos ?? 0,
      // Solo tienen sentido si aún no la acredita ni la cursa
      requisitosPendientes: estado === "aprobada" || estado === "cursando" ? [] : requisitosPendientes,
      faltaPorcentaje: estado === "aprobada" || estado === "cursando" ? false : faltaPorcentaje,
    };
  }).sort((a, b) => a.semestreSugerido - b.semestreSugerido || a.clave.localeCompare(b.clave));

  // 4b. Co-requisitos: se cursan en el mismo semestre. Si la pareja no se puede inscribir (está bloqueada),
  //     esta tampoco. La pareja queda en requisitosPendientes (el front distingue pre/co con `correquisitos`).
  //     Se repite hasta estabilizar por si hay cadenas de co-requisitos.
  const porClaveEstado = new Map(materias.map((m) => [m.clave, m]));
  for (let cambio = true; cambio;) {
    cambio = false;
    for (const m of materias) {
      if (m.estado !== "disponible" && m.estado !== "reprobada") continue;
      const bloqueantes = m.correquisitos.filter((c) => porClaveEstado.get(c)?.estado === "bloqueada" && !m.requisitosPendientes.includes(c));
      if (!bloqueantes.length) continue;
      m.requisitosPendientes = [...m.requisitosPendientes, ...bloqueantes];
      if (m.estado === "disponible") m.estado = "bloqueada";
      cambio = true;
    }
  }

  // 5. Semestres cursados (periodos regulares del kardex + el actual)
  const regulares = new Set(kardex.materias.map((m) => m.periodo).filter((p) => !/\/V$/i.test(p)));
  const periodoActual = calificaciones.periodo?.clave ?? null;
  if (periodoActual && calificaciones.materias.length) regulares.add(periodoActual);
  const semestresCursados = regulares.size;

  // 6. Estimación de semestres restantes = máx(créditos pendientes / ritmo, cadena de seriación más larga)
  const porMateria = new Map(materias.map((m) => [m.clave, m]));
  const pendientes = materias.filter((m) => m.estado !== "aprobada" && m.estado !== "cursando");
  // Servicio Social y Actividades Complementarias se hacen EN PARALELO a las clases: no suman semestres
  const enParalelo = (m: MateriaAvance) => m.tipo === "servicio" || m.tipo === "complementaria";
  const creditosPendientes = pendientes.filter((m) => !enParalelo(m)).reduce((s, m) => s + m.creditos, 0);
  const creditosCursando = materias.filter((m) => m.estado === "cursando").reduce((s, m) => s + m.creditos, 0);

  const profundidad = new Map<string, number>();
  const prof = (clave: string, visitando = new Set<string>()): number => {
    if (profundidad.has(clave)) return profundidad.get(clave)!;
    if (visitando.has(clave)) return 1; // por si alguien captura un ciclo en el admin
    visitando.add(clave);
    const m = porMateria.get(clave)!;
    if (enParalelo(m)) { profundidad.set(clave, 0); return 0; }
    const previas = m.requisitos.map((r) => porMateria.get(r)).filter((p) => p && p.estado !== "aprobada" && p.estado !== "cursando");
    const d = 1 + Math.max(0, ...previas.map((p) => prof(p!.clave, visitando)));
    profundidad.set(clave, d);
    return d;
  };
  const cadena = Math.max(0, ...pendientes.map((m) => prof(m.clave)));
  const pendientesEnParalelo = pendientes.filter(enParalelo);
  const semestresPrevios = Math.max(1, semestresCursados - (calificaciones.materias.length ? 1 : 0));
  const ritmo = Math.min(MAX_CREDITOS_SEMESTRE, Math.max(20, Math.round(creditosAprobados / semestresPrevios)));
  const semestresRestantesEstimados = creditosPendientes ? Math.max(cadena, Math.ceil(creditosPendientes / ritmo)) : 0;

  const base = periodoActual ?? kardex.periodos.at(-1)?.clave ?? null;
  // Si hoy cursas materias, el periodo actual cuenta; los restantes se suman a partir de él
  const egresoClave = base ? sumarSemestres(base, semestresRestantesEstimados) : null;
  const egresoEstimado = egresoClave ? textoPeriodo(egresoClave) : "—";

  // 7. Alertas
  const alertas: Alerta[] = [];
  for (const m of materias.filter((x) => x.estado === "cursando")) {
    if (m.intentos >= 2) alertas.push({ nivel: "critica", clave: m.clave, mensaje: `${m.nombre}: estás en curso especial. Si no la acreditas, es baja definitiva.` });
    else if (m.intentos === 1) alertas.push({ nivel: "advertencia", clave: m.clave, mensaje: `${m.nombre}: la cursas en repetición.` });
  }
  for (const m of materias.filter((x) => x.estado === "reprobada")) {
    alertas.push({ nivel: m.intentos >= 2 ? "critica" : "advertencia", clave: m.clave, mensaje: `${m.nombre} no está acreditada: debes ${m.intentos >= 2 ? "cursarla en especial" : "recursarla"}.` });
  }
  if (semestresCursados + semestresRestantesEstimados > LIMITE_SEMESTRES) {
    alertas.push({ nivel: "critica", mensaje: `Al ritmo estimado terminarías en ${semestresCursados + semestresRestantesEstimados} semestres; el máximo permitido es ${LIMITE_SEMESTRES}.` });
  } else if (semestresCursados >= 10) {
    alertas.push({ nivel: "advertencia", mensaje: `Llevas ${semestresCursados} de ${LIMITE_SEMESTRES} semestres permitidos.` });
  }
  if (estudiante.creditosComplementarios < 5 && !aprobada("ACT-0000")) {
    alertas.push({ nivel: semestresCursados >= 7 ? "advertencia" : "info", mensaje: `Llevas ${estudiante.creditosComplementarios} de 5 créditos complementarios (deben cubrirse del 1.º al 7.º semestre).` });
  }
  for (const m of pendientesEnParalelo) {
    if (m.tipo === "servicio" && m.estado === "disponible") {
      alertas.push({ nivel: "info", clave: m.clave, mensaje: "El SII no reporta tu Servicio Social: si aún no lo haces, ya puedes iniciarlo (puede ser en paralelo a tus clases)." });
    }
  }
  if (porcentaje >= 80) alertas.push({ nivel: "info", mensaje: "Ya tienes el 80 % de créditos: puedes hacer Residencias si ya acreditaste Servicio Social y Actividades Complementarias." });
  else if (porcentaje >= 70) alertas.push({ nivel: "info", mensaje: "Ya tienes el 70 % de créditos: puedes hacer tu Servicio Social." });
  if (!solicitada && !detectada && especialidad) {
    alertas.push({ nivel: "info", mensaje: `No detectamos tu especialidad en el kardex; se muestra "${especialidad.nombre}". Puedes cambiarla.` });
  }

  const orden = { critica: 0, advertencia: 1, info: 2 } as const;
  alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel]);

  return {
    plan: reticula.plan,
    especialidad: especialidad ? { ...especialidad, detectada: detectada?.id === especialidad.id } : null,
    especialidades: reticula.especialidades.map(({ clave, nombre }) => ({ clave, nombre })),
    materias,
    resumen: {
      creditosAprobados, creditosCursando, creditosTotales: total, porcentaje,
      semestresCursados, semestresRestantesEstimados, egresoEstimado,
    },
    alertas,
  };
}

/** Materias que el alumno puede inscribir el próximo periodo. */
export function clavesInscribibles(avance: AvancePlan): Set<string> {
  return new Set(
    avance.materias
      .filter((m) => m.estado === "disponible" || (m.estado === "reprobada" && !m.requisitosPendientes.length && !m.faltaPorcentaje))
      .filter((m) => m.tipo === "basica" || m.tipo === "especialidad")
      .map((m) => m.clave),
  );
}

// ---------- Generador de horarios ----------

const min = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + (m || 0); };
const hhmm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const DIAS: DiaSemana[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

export function chocan(a: GrupoOferta, b: GrupoOferta): boolean {
  return a.bloques.some((x) => b.bloques.some((y) => x.dia === y.dia && min(x.inicio) < min(y.fin) && min(y.inicio) < min(x.fin)));
}

function cumplePreferencias(g: GrupoOferta, p: Preferencias): boolean {
  if (p.evitarSabado && g.bloques.some((b) => b.dia === "sabado")) return false;
  if (p.turno === "matutino" && g.bloques.some((b) => min(b.fin) > min("14:00"))) return false;
  if (p.turno === "vespertino" && g.bloques.some((b) => min(b.inicio) < min("13:00"))) return false;
  return true;
}

function evaluar(grupos: GrupoOferta[]): OpcionHorario {
  let horasHueco = 0, entrada = Infinity, salida = -Infinity, diasConClase = 0;
  for (const dia of DIAS) {
    const bs = grupos.flatMap((g) => g.bloques).filter((b) => b.dia === dia).sort((a, b) => min(a.inicio) - min(b.inicio));
    if (!bs.length) continue;
    diasConClase++;
    for (let i = 1; i < bs.length; i++) horasHueco += Math.max(0, min(bs[i].inicio) - min(bs[i - 1].fin)) / 60;
    entrada = Math.min(entrada, min(bs[0].inicio));
    salida = Math.max(salida, min(bs.at(-1)!.fin));
  }
  const puntuacion = Math.max(0, Math.min(100, Math.round(100 - horasHueco * 8 - Math.max(0, diasConClase - 3) * 4)));
  return {
    grupos, creditos: grupos.reduce((s, g) => s + g.creditos, 0),
    horasHueco, diasConClase,
    horaEntrada: Number.isFinite(entrada) ? hhmm(entrada) : "—",
    horaSalida: Number.isFinite(salida) ? hhmm(salida) : "—",
    puntuacion,
  };
}

export function generarHorarios(args: {
  claves: string[];
  grupos: GrupoOferta[];          // oferta (solo materias inscribibles)
  preferencias: Preferencias;
  correquisitos: Map<string, string[]>; // clave → co-requisitos no acreditados
  limite?: number;
}): OpcionesHorario {
  const { preferencias: p } = args;
  const claves = [...new Set(args.claves)];
  const advertencias: string[] = [];
  const sinSolucion: string[] = [];

  const candidatos: GrupoOferta[][] = [];
  for (const clave of claves) {
    const gs = args.grupos.filter((g) => g.clave === clave);
    if (!gs.length) { sinSolucion.push(clave); advertencias.push(`${clave}: no se oferta o no puedes cursarla todavía.`); continue; }
    const ok = gs.filter((g) => cumplePreferencias(g, p));
    if (!ok.length) { sinSolucion.push(clave); advertencias.push(`${gs[0].nombre}: ningún grupo cumple tus preferencias.`); continue; }
    candidatos.push(ok);
  }

  for (const clave of claves) {
    for (const co of args.correquisitos.get(clave) ?? []) {
      if (!claves.includes(co)) advertencias.push(`${clave} tiene como co-requisito ${co}: deben cursarse juntas.`);
    }
  }

  const creditos = candidatos.reduce((s, gs) => s + gs[0].creditos, 0);
  if (creditos > MAX_CREDITOS_SEMESTRE) advertencias.push(`Suman ${creditos} créditos; la carga máxima reglamentaria es ${MAX_CREDITOS_SEMESTRE}.`);

  // Búsqueda con retroceso: primero las materias con menos grupos (poda más rápido)
  candidatos.sort((a, b) => a.length - b.length);
  const encontradas: OpcionHorario[] = [];
  const elegidos: GrupoOferta[] = [];
  let exploradas = 0;
  const buscar = (i: number) => {
    if (exploradas++ > 50_000 || encontradas.length >= 500) return;
    if (i === candidatos.length) { encontradas.push(evaluar([...elegidos])); return; }
    for (const g of candidatos[i]) {
      if (elegidos.some((e) => chocan(e, g))) continue;
      elegidos.push(g); buscar(i + 1); elegidos.pop();
    }
  };
  if (candidatos.length) buscar(0);

  if (candidatos.length && !encontradas.length) {
    advertencias.push("No hay ninguna combinación sin choques con todas las materias elegidas. Quita alguna o cambia tus preferencias.");
  }

  const tramo = (o: OpcionHorario) => min(o.horaSalida) - min(o.horaEntrada);
  encontradas.sort((a, b) => b.puntuacion - a.puntuacion || a.horasHueco - b.horasHueco || tramo(a) - tramo(b) || a.horaEntrada.localeCompare(b.horaEntrada));
  return { opciones: encontradas.slice(0, args.limite ?? 10), sinSolucion, advertencias };
}
