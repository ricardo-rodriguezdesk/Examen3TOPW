// Colores y textos del Planificador por estado de materia (Persona B). Misma regla en Avance, Mapa y Generador.
// aprobada (verde) · cursando (azul) · disponible (blanco) · bloqueada (gris) · reprobada pendiente (rojo)

import { useOutletContext } from "react-router";
import type { EstadoMateria } from "../types/api";
import { tituloBonito } from "./desempeno";

export const ORDEN_ESTADOS: EstadoMateria[] = ["aprobada", "cursando", "disponible", "bloqueada", "reprobada"];

export const estiloEstado: Record<EstadoMateria, { etiqueta: string; nodo: string; texto: string; punto: string; barra: string }> = {
  aprobada: { etiqueta: "Aprobada", nodo: "border-alto/40 bg-alto-suave", texto: "text-alto", punto: "bg-alto", barra: "#15803d" },
  cursando: { etiqueta: "Cursando", nodo: "border-marca-500/50 bg-marca-50", texto: "text-marca-700", punto: "bg-marca-500", barra: "#2f5fa8" },
  disponible: { etiqueta: "Disponible", nodo: "border-slate-300 bg-white", texto: "text-slate-700", punto: "bg-white ring-2 ring-slate-400 ring-inset", barra: "#ffffff" },
  bloqueada: { etiqueta: "Bloqueada", nodo: "border-slate-200 bg-slate-100", texto: "text-slate-400", punto: "bg-slate-300", barra: "#cbd5e1" },
  reprobada: { etiqueta: "Reprobada pendiente", nodo: "border-bajo/40 bg-bajo-suave", texto: "text-bajo", punto: "bg-bajo", barra: "#b91c1c" },
};

/** Especialidad elegida en el selector del PlanificadorLayout (undefined = la que detecta el backend). */
export interface ContextoPlanificador { especialidad: string | undefined; setEspecialidad: (c: string | undefined) => void }
export const useEspecialidad = () => useOutletContext<ContextoPlanificador>();

/** Los nombres llegan en MAYÚSCULAS dentro de los mensajes del backend: "Vas en riesgo en INGENIERÍA DE SOFTWARE" → "Ingeniería de Software". */
export const suavizarMayusculas = (s: string) =>
  s.replace(/(?<!\p{L})\p{Lu}{2,}(?:\s+\p{Lu}+)*(?!\p{L})/gu, (m) => (m.length > 3 ? tituloBonito(m) : m));
