// Semáforo de desempeño: misma regla en toda la app.
// alto ≥ 90 (verde) · medio 70–89 (amarillo) · bajo < 70 (rojo) · sin_datos (gris)

import type { Desempeno } from "../types/api";

export const estiloDesempeno: Record<Desempeno, { texto: string; fondo: string; borde: string; punto: string; etiqueta: string }> = {
  alto: { texto: "text-alto", fondo: "bg-alto-suave", borde: "border-alto/30", punto: "bg-alto", etiqueta: "Excelente" },
  medio: { texto: "text-medio", fondo: "bg-medio-suave", borde: "border-medio/30", punto: "bg-medio", etiqueta: "Aprobando" },
  bajo: { texto: "text-bajo", fondo: "bg-bajo-suave", borde: "border-bajo/30", punto: "bg-bajo", etiqueta: "En riesgo" },
  sin_datos: { texto: "text-slate-500", fondo: "bg-slate-100", borde: "border-slate-200", punto: "bg-slate-400", etiqueta: "Sin datos" },
};

export function desempenoDe(calif: number | null): Desempeno {
  if (calif === null) return "sin_datos";
  if (calif >= 90) return "alto";
  if (calif >= 70) return "medio";
  return "bajo";
}

/** Capitaliza nombres que vienen en MAYÚSCULAS del SII: "ESTRUCTURA DE DATOS" → "Estructura de Datos" */
export function tituloBonito(s: string): string {
  const menores = new Set(["de", "del", "la", "las", "los", "y", "e", "en", "a", "el", "para", "por", "con"]);
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => {
      if (/^(i|ii|iii|iv|v|vi)$/.test(p)) return p.toUpperCase(); // números romanos: "Autómatas II"
      if (i > 0 && menores.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(" ");
}
