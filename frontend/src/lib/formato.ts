// Utilidades de presentación compartidas por Calificaciones, Kardex y el Planificador (Persona B).

import type { TipoCurso } from "../types/api";

/** Quita acentos y pasa a minúsculas para que "calculo" encuentre "CÁLCULO". */
export const normalizarTexto = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** true si `busqueda` (ya normalizada) aparece en alguno de los campos. */
export const coincide = (busqueda: string, ...campos: string[]) =>
  !busqueda || campos.some((c) => normalizarTexto(c).includes(busqueda));

/** Badge de tipo de curso: Ordinario (neutro), Repetición (ámbar), Especial (rojo). */
export const tonoTipo: Record<TipoCurso, { tono: "neutro" | "medio" | "bajo"; texto: string }> = {
  ordinario: { tono: "neutro", texto: "Ordinario" },
  repeticion: { tono: "medio", texto: "Repetición" },
  especial: { tono: "bajo", texto: "Especial" },
  otro: { tono: "neutro", texto: "Otro" },
};
