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

export const planificadorRouter = Router();
planificadorRouter.use(requiereSesion);

// Caché de 60 s por sesión: el avance necesita 3 llamadas al SII y lo usan las 3 pantallas.
const cache = new Map<string, { t: number; avance: AvancePlan }>();
/** El panel de admin lo llama al modificar la retícula o la oferta. */
export const limpiarCachePlanificador = () => cache.clear();

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
  cache.set(llave, { t: Date.now(), avance });
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
