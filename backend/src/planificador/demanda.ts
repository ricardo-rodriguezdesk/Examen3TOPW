// DEMANDA DE GRUPOS
//
// Alumno:  guarda el horario que planea cursar (uno por periodo) → se reemplaza si vuelve a guardar.
// Admin:   ve cuántos alumnos planean cada grupo, la ocupación contra el cupo y una recomendación
//          por materia (abrir otro grupo, redistribuir, poca demanda…).
//
// Privacidad: el alumno se identifica con un HMAC de su número de control. La coordinación ve CONTEOS,
// nunca quién eligió qué.

import { createHmac } from "node:crypto";
import { config } from "../config.js";
import { db, type Db } from "../db/index.js";
import { textoPeriodo } from "../sii/normalizar.js";
import { chocan, MAX_CREDITOS_SEMESTRE } from "./logica.js";
import { leerGrupos } from "./repositorio.js";
import type { GrupoOferta } from "./tipos.js";

export const hashAlumno = (numeroControl: string) =>
  createHmac("sha256", config.adminSecreto).update(`alumno:${numeroControl.trim().toLowerCase()}`).digest("hex");

// ---------------- Tipos (contrato) ----------------

export interface MiHorario {
  periodo: string | null;
  periodoTexto: string;
  guardado: { grupos: GrupoOferta[]; creditos: number; actualizado: string } | null;
}

export type NivelOcupacion = "lleno" | "alto" | "normal" | "bajo";

export interface DemandaGrupo {
  id: number; grupo: string; docente: string | null; cupo: number;
  planeados: number; reales: number; simulados: number;
  ocupacion: number; // 0–∞ (1 = cupo lleno)
  nivel: NivelOcupacion;
}

export interface DemandaMateria {
  clave: string; nombre: string; semestre: number;
  planeados: number; cupoTotal: number; faltan: number;
  grupos: DemandaGrupo[];
  recomendacion: { tipo: "abrir" | "redistribuir" | "baja" | "sin_demanda"; mensaje: string } | null;
}

export interface Demanda {
  periodo: string | null;
  periodoTexto: string;
  incluyeSimulados: boolean;
  resumen: {
    alumnos: number; alumnosReales: number; alumnosSimulados: number;
    gruposLlenos: number; materiasConFaltante: number; lugaresFaltantes: number;
  };
  porEspecialidad: { especialidad: string; alumnos: number }[];
  materias: DemandaMateria[]; // ordenadas: primero las que necesitan atención
}

// ---------------- Alumno ----------------

export async function leerMiHorario(alumnoHash: string, periodo: string | null): Promise<MiHorario> {
  const base = { periodo, periodoTexto: periodo ? textoPeriodo(periodo) : "Sin oferta capturada" };
  if (!periodo) return { ...base, guardado: null };
  const d = await db();
  const [plan] = await d.query<{ id: number; actualizado: Date }>(
    "SELECT id, actualizado FROM planes_alumno WHERE alumno_hash = $1 AND periodo = $2", [alumnoHash, periodo],
  );
  if (!plan) return { ...base, guardado: null };
  const ids = (await d.query<{ grupo_id: number }>("SELECT grupo_id FROM planes_alumno_grupos WHERE plan_id = $1", [plan.id])).map((r) => r.grupo_id);
  const grupos = (await leerGrupos(periodo)).filter((g) => ids.includes(g.id));
  return {
    ...base,
    guardado: { grupos, creditos: grupos.reduce((s, g) => s + g.creditos, 0), actualizado: new Date(plan.actualizado).toISOString() },
  };
}

/** Valida y guarda (reemplaza) el horario planeado. Devuelve un mensaje de error o null si todo bien. */
export function validarSeleccion(seleccion: GrupoOferta[]): string | null {
  const claves = new Set<string>();
  for (const g of seleccion) {
    if (claves.has(g.clave)) return `Elegiste dos grupos de ${g.nombre}: deja solo uno.`;
    claves.add(g.clave);
  }
  for (let i = 0; i < seleccion.length; i++) {
    for (let j = i + 1; j < seleccion.length; j++) {
      if (chocan(seleccion[i], seleccion[j])) return `${seleccion[i].nombre} (grupo ${seleccion[i].grupo}) choca con ${seleccion[j].nombre} (grupo ${seleccion[j].grupo}).`;
    }
  }
  const creditos = seleccion.reduce((s, g) => s + g.creditos, 0);
  if (creditos > MAX_CREDITOS_SEMESTRE) return `Suman ${creditos} créditos; la carga máxima es ${MAX_CREDITOS_SEMESTRE}.`;
  return null;
}

export async function guardarMiHorario(args: {
  alumnoHash: string; periodo: string; grupos: GrupoOferta[]; especialidad: string | null; semestre: number | null; simulado?: boolean; db?: Pick<Db, "query">;
}) {
  const ejecutar = async (tx: Pick<Db, "query">) => {
    const creditos = args.grupos.reduce((s, g) => s + g.creditos, 0);
    const [plan] = await tx.query<{ id: number }>(
      `INSERT INTO planes_alumno (alumno_hash, periodo, especialidad, semestre, creditos, simulado, actualizado)
       VALUES ($1,$2,$3,$4,$5,$6, now())
       ON CONFLICT (alumno_hash, periodo) DO UPDATE
         SET especialidad = EXCLUDED.especialidad, semestre = EXCLUDED.semestre, creditos = EXCLUDED.creditos, actualizado = now()
       RETURNING id`,
      [args.alumnoHash, args.periodo, args.especialidad, args.semestre, creditos, args.simulado ?? false],
    );
    await tx.query("DELETE FROM planes_alumno_grupos WHERE plan_id = $1", [plan.id]);
    for (const g of args.grupos) await tx.query("INSERT INTO planes_alumno_grupos (plan_id, grupo_id) VALUES ($1,$2)", [plan.id, g.id]);
  };
  if (args.db) return ejecutar(args.db);
  return (await db()).transaccion(ejecutar);
}

export async function borrarMiHorario(alumnoHash: string, periodo: string) {
  await (await db()).query("DELETE FROM planes_alumno WHERE alumno_hash = $1 AND periodo = $2", [alumnoHash, periodo]);
}

// ---------------- Coordinación ----------------

const nivel = (ocupacion: number): NivelOcupacion =>
  ocupacion >= 1 ? "lleno" : ocupacion >= 0.8 ? "alto" : ocupacion >= 0.3 ? "normal" : "bajo";

/** Lógica pura: arma la recomendación de una materia a partir de sus grupos. */
export function recomendar(m: Pick<DemandaMateria, "planeados" | "cupoTotal" | "grupos">): DemandaMateria["recomendacion"] {
  const faltan = Math.max(0, m.planeados - m.cupoTotal);
  if (m.planeados === 0) return { tipo: "sin_demanda", mensaje: "Nadie la ha planeado: considera no abrirla o abrir un solo grupo." };
  if (faltan > 0) {
    const grupos = Math.ceil(faltan / Math.max(1, Math.round(m.cupoTotal / Math.max(1, m.grupos.length))));
    return { tipo: "abrir", mensaje: `Faltan ${faltan} lugares: abre ${grupos === 1 ? "otro grupo" : `${grupos} grupos más`} o amplía el cupo.` };
  }
  const llenos = m.grupos.filter((g) => g.nivel === "lleno");
  const bajos = m.grupos.filter((g) => g.ocupacion < 0.5);
  if (llenos.length && bajos.length) {
    return { tipo: "redistribuir", mensaje: `Grupo ${llenos.map((g) => g.grupo).join(", ")} lleno y ${bajos.map((g) => g.grupo).join(", ")} con poca demanda: conviene redistribuir u ofrecer otro horario.` };
  }
  if (m.grupos.length > 1 && m.planeados <= (m.cupoTotal / m.grupos.length) * 0.4) {
    return { tipo: "baja", mensaje: "Demanda baja: probablemente baste con un grupo." };
  }
  return null;
}

const prioridad = { abrir: 0, redistribuir: 1, baja: 2, sin_demanda: 3 } as const;

export async function calcularDemanda(periodo: string | null, incluyeSimulados: boolean): Promise<Demanda> {
  const vacio: Demanda = {
    periodo, periodoTexto: periodo ? textoPeriodo(periodo) : "Sin oferta capturada", incluyeSimulados,
    resumen: { alumnos: 0, alumnosReales: 0, alumnosSimulados: 0, gruposLlenos: 0, materiasConFaltante: 0, lugaresFaltantes: 0 },
    porEspecialidad: [], materias: [],
  };
  if (!periodo) return vacio;
  const d = await db();

  const filas = await d.query<{
    id: number; clave: string; nombre: string; semestre: number; grupo: string; docente: string | null; cupo: number; reales: number; simulados: number;
  }>(
    `SELECT g.id, m.clave, m.nombre, m.semestre, g.grupo, g.docente, g.cupo,
            count(pa.id) FILTER (WHERE NOT pa.simulado)::int AS reales,
            count(pa.id) FILTER (WHERE pa.simulado)::int     AS simulados
       FROM grupos g
       JOIN materias m ON m.id = g.materia_id
       LEFT JOIN planes_alumno_grupos pg ON pg.grupo_id = g.id
       LEFT JOIN planes_alumno pa ON pa.id = pg.plan_id AND pa.periodo = g.periodo
      WHERE g.periodo = $1
      GROUP BY g.id, m.id
      ORDER BY m.semestre, m.clave, g.grupo`, [periodo],
  );

  const porClave = new Map<string, DemandaMateria>();
  for (const f of filas) {
    const planeados = f.reales + (incluyeSimulados ? f.simulados : 0);
    const ocupacion = f.cupo > 0 ? planeados / f.cupo : planeados > 0 ? Infinity : 0;
    const g: DemandaGrupo = {
      id: f.id, grupo: f.grupo, docente: f.docente, cupo: f.cupo, planeados, reales: f.reales, simulados: f.simulados,
      ocupacion: Number.isFinite(ocupacion) ? Math.round(ocupacion * 100) / 100 : 99, nivel: nivel(ocupacion),
    };
    const m = porClave.get(f.clave) ?? { clave: f.clave, nombre: f.nombre, semestre: f.semestre, planeados: 0, cupoTotal: 0, faltan: 0, grupos: [], recomendacion: null };
    m.grupos.push(g);
    m.planeados += planeados;
    m.cupoTotal += f.cupo;
    porClave.set(f.clave, m);
  }

  const materias = [...porClave.values()].map((m) => ({ ...m, faltan: Math.max(0, m.planeados - m.cupoTotal), recomendacion: recomendar(m) }));
  materias.sort((a, b) =>
    (a.recomendacion ? prioridad[a.recomendacion.tipo] : 9) - (b.recomendacion ? prioridad[b.recomendacion.tipo] : 9) ||
    b.faltan - a.faltan || b.planeados - a.planeados || a.clave.localeCompare(b.clave));

  const [totales] = await d.query<{ reales: number; simulados: number }>(
    `SELECT count(*) FILTER (WHERE NOT simulado)::int AS reales, count(*) FILTER (WHERE simulado)::int AS simulados
       FROM planes_alumno WHERE periodo = $1`, [periodo],
  );
  const porEspecialidad = await d.query<{ especialidad: string; alumnos: number }>(
    `SELECT coalesce(e.nombre, pa.especialidad, 'Sin especialidad') AS especialidad, count(*)::int AS alumnos
       FROM planes_alumno pa LEFT JOIN especialidades e ON e.clave = pa.especialidad
      WHERE pa.periodo = $1 AND ($2 OR NOT pa.simulado)
      GROUP BY 1 ORDER BY 2 DESC`, [periodo, incluyeSimulados],
  );

  return {
    ...vacio,
    resumen: {
      alumnos: totales.reales + (incluyeSimulados ? totales.simulados : 0),
      alumnosReales: totales.reales,
      alumnosSimulados: totales.simulados,
      gruposLlenos: materias.reduce((s, m) => s + m.grupos.filter((g) => g.nivel === "lleno").length, 0),
      materiasConFaltante: materias.filter((m) => m.faltan > 0).length,
      lugaresFaltantes: materias.reduce((s, m) => s + m.faltan, 0),
    },
    porEspecialidad,
    materias,
  };
}

// ---------------- Datos de demostración ----------------

/** Generador pseudoaleatorio con semilla: los datos simulados salen iguales en cada arranque. */
function mulberry32(semilla: number) {
  return () => {
    semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Genera N alumnos SIMULADOS con horarios válidos (sin choques, un grupo por materia),
 * concentrados en 6.º–8.º semestre y con preferencia por el turno matutino, para que la
 * pantalla de demanda muestre grupos llenos, redistribuciones y materias con poca demanda.
 */
export async function generarDemandaSimulada(periodo: string, alumnos = 150): Promise<number> {
  const d = await db();
  const grupos = await leerGrupos(periodo);
  if (!grupos.length) return 0;
  const info = await d.query<{ clave: string; semestre: number; especialidad: string | null }>(
    `SELECT m.clave, m.semestre, e.clave AS especialidad FROM materias m LEFT JOIN especialidades e ON e.id = m.especialidad_id`,
  );
  const meta = new Map(info.map((i) => [i.clave, i]));
  const especialidades = [...new Set(info.map((i) => i.especialidad).filter(Boolean))] as string[];
  const azar = mulberry32(2027);

  // Popularidad por materia (cola larga): unas pocas materias "cuello de botella" concentran la demanda,
  // como pasa en la realidad con las que todos atrasan o las de especialidad más pedidas.
  const claves = [...new Set(grupos.map((g) => g.clave))];
  const popularidad = new Map(claves.map((c) => [c, 0.15 + 5 * azar() ** 4]));

  return d.transaccion(async (tx) => {
    await tx.query("DELETE FROM planes_alumno WHERE periodo = $1 AND simulado", [periodo]);
    let creados = 0;
    for (let n = 1; n <= alumnos; n++) {
      const r = azar();
      const semestre = r < 0.15 ? 5 : r < 0.4 ? 6 : r < 0.75 ? 7 : 8;
      const especialidad = especialidades.length ? especialidades[Math.floor(azar() ** 1.6 * especialidades.length)] : null;
      const posibles = claves.filter((c) => {
        const m = meta.get(c);
        return m && m.semestre <= semestre && m.semestre >= semestre - 2 && (m.especialidad === null || m.especialidad === especialidad);
      });
      // Elige 4–6 materias con probabilidad proporcional a su popularidad (muestreo ponderado sin reemplazo)
      const barajadas = posibles
        .map((c) => ({ c, k: azar() ** (1 / popularidad.get(c)!) }))
        .sort((a, b) => b.k - a.k)
        .map((x) => x.c);
      const meta_ = 4 + Math.floor(azar() * 3);
      const elegidos: GrupoOferta[] = [];
      for (const clave of barajadas) {
        if (elegidos.length >= meta_) break;
        // 85 % prefiere el grupo A (matutino) → se saturan y aparecen recomendaciones de redistribuir
        const opciones = grupos.filter((g) => g.clave === clave).sort((a, b) => (azar() < 0.85 ? a.grupo.localeCompare(b.grupo) : b.grupo.localeCompare(a.grupo)));
        const g = opciones.find((o) => !elegidos.some((e) => chocan(e, o)));
        if (g) elegidos.push(g);
      }
      if (!elegidos.length) continue;
      await guardarMiHorario({
        alumnoHash: `simulado-${String(n).padStart(3, "0")}`, periodo, grupos: elegidos,
        especialidad, semestre, simulado: true, db: tx,
      });
      creados++;
    }
    return creados;
  });
}

/** Al arrancar: si el periodo de oferta no tiene datos simulados, los genera (una sola vez). */
export async function sembrarDemandaSiFalta(d: Db, periodo: string | null) {
  if (!periodo) return;
  const [{ n }] = await d.query<{ n: number }>("SELECT count(*)::int AS n FROM planes_alumno WHERE periodo = $1 AND simulado", [periodo]);
  if (n > 0) return;
  const creados = await generarDemandaSimulada(periodo);
  if (creados) console.log(`BD: demanda simulada generada (${creados} alumnos, periodo ${periodo})`);
}
