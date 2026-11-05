// Consultas a la BD del Planificador.

import { db } from "../db/index.js";
import { ordenPeriodo, textoPeriodo } from "../sii/normalizar.js";
import type { DiaSemana } from "../sii/tipos-app.js";
import type { DatosReticula, MateriaReticula } from "./logica.js";
import type { GrupoOferta } from "./tipos.js";

export async function leerReticula(): Promise<DatosReticula> {
  const d = await db();
  const [plan] = await d.query<{ id: number; clave: string; nombre: string; creditos_totales: number }>(
    "SELECT * FROM planes ORDER BY id LIMIT 1",
  );
  if (!plan) throw new Error("No hay planes de estudio cargados");

  const especialidades = await d.query<{ id: number; clave: string; nombre: string }>(
    "SELECT id, clave, nombre FROM especialidades WHERE plan_id = $1 ORDER BY id", [plan.id],
  );
  const filas = await d.query<{
    id: number; clave: string; nombre: string; creditos: number; semestre: number; tipo: MateriaReticula["tipo"];
    porcentaje_requerido: number | null; especialidad_id: number | null;
  }>("SELECT * FROM materias WHERE plan_id = $1 ORDER BY semestre, clave", [plan.id]);
  const reqs = await d.query<{ materia_id: number; clave: string; tipo: "pre" | "co" }>(
    `SELECT r.materia_id, m.clave, r.tipo FROM requisitos r JOIN materias m ON m.id = r.requisito_id WHERE m.plan_id = $1`, [plan.id],
  );

  return {
    plan: { id: plan.id, clave: plan.clave, nombre: plan.nombre, creditosTotales: plan.creditos_totales },
    especialidades,
    materias: filas.map((f) => ({
      id: f.id, clave: f.clave, nombre: f.nombre, creditos: f.creditos, semestre: f.semestre, tipo: f.tipo,
      porcentajeRequerido: f.porcentaje_requerido, especialidadId: f.especialidad_id,
      pre: reqs.filter((r) => r.materia_id === f.id && r.tipo === "pre").map((r) => r.clave),
      co: reqs.filter((r) => r.materia_id === f.id && r.tipo === "co").map((r) => r.clave),
    })),
  };
}

/** Periodo más reciente con oferta capturada. */
export async function periodoOferta(): Promise<string | null> {
  const d = await db();
  const filas = await d.query<{ periodo: string }>("SELECT DISTINCT periodo FROM grupos");
  return filas.map((f) => f.periodo).sort((a, b) => ordenPeriodo(b) - ordenPeriodo(a))[0] ?? null;
}

export async function leerGrupos(periodo: string, claves?: Set<string>): Promise<GrupoOferta[]> {
  const d = await db();
  const grupos = await d.query<{ id: number; clave: string; nombre: string; creditos: number; grupo: string; docente: string | null; cupo: number }>(
    `SELECT g.id, m.clave, m.nombre, m.creditos, g.grupo, g.docente, g.cupo
       FROM grupos g JOIN materias m ON m.id = g.materia_id
      WHERE g.periodo = $1 ORDER BY m.semestre, m.clave, g.grupo`, [periodo],
  );
  const filtrados = claves ? grupos.filter((g) => claves.has(g.clave)) : grupos;
  if (!filtrados.length) return [];
  const bloques = await d.query<{ grupo_id: number; dia: DiaSemana; inicio: string; fin: string; salon: string | null }>(
    `SELECT grupo_id, dia, inicio, fin, salon FROM bloques WHERE grupo_id = ANY($1::int[]) ORDER BY inicio`, [filtrados.map((g) => g.id)],
  );
  return filtrados.map((g) => ({
    ...g,
    bloques: bloques.filter((b) => b.grupo_id === g.id).map(({ dia, inicio, fin, salon }) => ({ dia, inicio, fin, salon }))
      .sort((a, b) => ORDEN_DIA.indexOf(a.dia) - ORDEN_DIA.indexOf(b.dia) || a.inicio.localeCompare(b.inicio)),
  }));
}

const ORDEN_DIA: DiaSemana[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

export { textoPeriodo };
