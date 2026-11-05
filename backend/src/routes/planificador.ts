// Rutas del Planificador para el ALUMNO (requieren sesión del SII).

import { Router, type Request } from "express";
import { config } from "../config.js";
import { requiereSesion } from "../middleware/auth.js";
import { calcularAvance, clavesInscribibles, generarHorarios } from "../planificador/logica.js";
import { leerGrupos, leerReticula, periodoOferta, textoPeriodo } from "../planificador/repositorio.js";
import type { AvancePlan, Oferta, Preferencias } from "../planificador/tipos.js";
import { sii } from "../sii/cliente.js";
import { normalizarCalificaciones, normalizarEstudiante, normalizarKardex } from "../sii/normalizar.js";
import { AppError } from "../utils/errors.js";
import { borrarMiHorario, guardarMiHorario, hashAlumno, leerMiHorario, validarSeleccion } from "../planificador/demanda.js";

export const planificadorRouter = Router();
planificadorRouter.use(requiereSesion);

// Caché de 60 s por sesión: el avance necesita 3 llamadas al SII y lo usan las 3 pantallas.
const cache = new Map<string, { t: number; avance: AvancePlan }>();
/** El panel de admin lo llama al modificar la retícula o la oferta. */
export const limpiarCachePlanificador = () => cache.clear();

// Datos del alumno de la sesión (para guardar su horario sin volver a llamar al SII)
const alumnos = new Map<string, { numeroControl: string; semestre: number }>();

async function avanceDe(req: Request): Promise<AvancePlan> {
  const especialidad = typeof req.query.especialidad === "string" ? req.query.especialidad : undefined;
  const llave = `${req.siiToken}|${especialidad ?? ""}`;
  const c = cache.get(llave);
  if (c && Date.now() - c.t < 60_000) return c.avance;

  const token = req.siiToken!;
  const [kardex, calificaciones, estudiante, reticula] = await Promise.all([
    sii.kardex(token).then(normalizarKardex),
    sii.calificaciones(token).then(normalizarCalificaciones),
    sii.estudiante(token).then(normalizarEstudiante),
    leerReticula(),
  ]);
  const avance = calcularAvance({
    reticula, kardex, calificaciones, estudiante,
    especialidadSolicitada: especialidad, especialidadPorDefecto: config.especialidadPorDefecto,
  });

  if (cache.size > 500) cache.clear();
  if (alumnos.size > 500) alumnos.clear();
  cache.set(llave, { t: Date.now(), avance });
  alumnos.set(token, { numeroControl: estudiante.numeroControl, semestre: estudiante.semestre });
  return avance;
}

/** GET /api/planificador/avance[?especialidad=ISIE-IDP-2025-01] */
planificadorRouter.get("/avance", async (req, res) => {
  res.json(await avanceDe(req));
});

/** GET /api/planificador/oferta → grupos del próximo periodo de las materias que el alumno puede cursar */
planificadorRouter.get("/oferta", async (req, res) => {
  const [avance, periodo] = await Promise.all([avanceDe(req), periodoOferta()]);
  if (!periodo) return res.json({ periodo: null, periodoTexto: "Sin oferta capturada", grupos: [] });
  const oferta: Oferta = { periodo, periodoTexto: textoPeriodo(periodo), grupos: await leerGrupos(periodo, clavesInscribibles(avance)) };
  res.json(oferta);
});

/** POST /api/planificador/generar  { claves: string[], preferencias?: { turno, evitarSabado, maxCreditos } } */
planificadorRouter.post("/generar", async (req, res) => {
  const claves = req.body?.claves;
  if (!Array.isArray(claves) || !claves.length || claves.some((c) => typeof c !== "string")) {
    throw new AppError(400, "DATOS_INVALIDOS", "Elige al menos una materia.");
  }
  if (claves.length > 12) throw new AppError(400, "DATOS_INVALIDOS", "Elige como máximo 12 materias.");

  const p = req.body?.preferencias ?? {};
  const preferencias: Preferencias = {
    turno: p.turno === "matutino" || p.turno === "vespertino" ? p.turno : undefined,
    evitarSabado: p.evitarSabado === true,
    maxCreditos: Number.isFinite(p.maxCreditos) && p.maxCreditos > 0 ? Number(p.maxCreditos) : undefined,
  };

  const [avance, periodo] = await Promise.all([avanceDe(req), periodoOferta()]);
  const inscribibles = clavesInscribibles(avance);
  const grupos = periodo ? await leerGrupos(periodo, inscribibles) : [];

  const elegidas = avance.materias.filter((m) => claves.includes(m.clave) && inscribibles.has(m.clave));
  const creditos = elegidas.reduce((s, m) => s + m.creditos, 0);
  if (preferencias.maxCreditos && creditos > preferencias.maxCreditos) {
    throw new AppError(400, "DATOS_INVALIDOS", `Las materias elegidas suman ${creditos} créditos y tu máximo es ${preferencias.maxCreditos}.`);
  }

  const aprobadas = new Set(avance.materias.filter((m) => m.estado === "aprobada" || m.estado === "cursando").map((m) => m.clave));
  const correquisitos = new Map(elegidas.map((m) => [m.clave, m.correquisitos.filter((c) => !aprobadas.has(c))]));

  const nombres = new Map(avance.materias.map((m) => [m.clave, m.nombre]));
  res.json(generarHorarios({ claves, grupos, preferencias, correquisitos, nombres }));
});

// ---------------- Mi horario (demanda de grupos) ----------------

async function alumnoDe(req: Request) {
  const avance = await avanceDe(req);
  let a = alumnos.get(req.siiToken!);
  if (!a) {
    const e = normalizarEstudiante(await sii.estudiante(req.siiToken!));
    a = { numeroControl: e.numeroControl, semestre: e.semestre };
    alumnos.set(req.siiToken!, a);
  }
  return { avance, hash: hashAlumno(a.numeroControl), semestre: a.semestre };
}

/** GET /api/planificador/mi-horario → el horario que el alumno guardó para el próximo periodo (o null) */
planificadorRouter.get("/mi-horario", async (req, res) => {
  const [{ hash }, periodo] = await Promise.all([alumnoDe(req), periodoOferta()]);
  res.json(await leerMiHorario(hash, periodo));
});

/** PUT /api/planificador/mi-horario  { grupoIds: number[] } → guarda (reemplaza) el horario planeado */
planificadorRouter.put("/mi-horario", async (req, res) => {
  const ids = req.body?.grupoIds;
  if (!Array.isArray(ids) || !ids.length || ids.length > 12 || ids.some((x) => !Number.isInteger(x))) {
    throw new AppError(400, "DATOS_INVALIDOS", "Envía entre 1 y 12 grupos.");
  }
  const [{ avance, hash, semestre }, periodo] = await Promise.all([alumnoDe(req), periodoOferta()]);
  if (!periodo) throw new AppError(400, "DATOS_INVALIDOS", "Todavía no hay oferta de grupos para planear.");

  // Solo grupos del periodo de oferta y de materias que este alumno SÍ puede cursar
  const disponibles = await leerGrupos(periodo, clavesInscribibles(avance));
  const seleccion = [...new Set(ids as number[])].map((id) => disponibles.find((g) => g.id === id));
  if (seleccion.some((g) => !g)) throw new AppError(400, "DATOS_INVALIDOS", "Algún grupo ya no está disponible o no puedes cursar esa materia.");

  const error = validarSeleccion(seleccion as NonNullable<(typeof seleccion)[number]>[]);
  if (error) throw new AppError(400, "DATOS_INVALIDOS", error);

  await guardarMiHorario({
    alumnoHash: hash, periodo, grupos: seleccion as NonNullable<(typeof seleccion)[number]>[],
    especialidad: avance.especialidad?.clave ?? null, semestre,
  });
  res.json(await leerMiHorario(hash, periodo));
});

/** DELETE /api/planificador/mi-horario → deja de planear (ya no cuenta en la demanda) */
planificadorRouter.delete("/mi-horario", async (req, res) => {
  const [{ hash }, periodo] = await Promise.all([alumnoDe(req), periodoOferta()]);
  if (periodo) await borrarMiHorario(hash, periodo);
  res.json(await leerMiHorario(hash, periodo));
});
