// Cuadrícula semanal reutilizable (días × horas).
// La usan la página Horario (A) y el Generador del Planificador (B).
//
//   <HorarioGrid bloques={horario.bloques} dias={horario.dias} horaInicio={7} horaFin={15} />
//
// Para datos que traen "07:00" en vez de minutos, usa aBloqueGrid() de abajo.

import clsx from "clsx";
import { useEffect, useState } from "react";
import type { DiaSemana } from "../types/api";
import { tituloBonito } from "../lib/desempeno";

export interface BloqueGrid {
  dia: DiaSemana;
  inicioMin: number; // minutos desde 00:00
  finMin: number;
  clave: string;
  nombre: string;
  grupo?: string;
  salon?: string | null;
  colorIndice: number;
}

export const NOMBRE_DIA: Record<DiaSemana, string> = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sabado: "Sábado",
};
export const DIAS_ORDEN: DiaSemana[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

/** Paleta: misma materia = mismo color en toda la app. */
export const COLORES_MATERIA = [
  { fondo: "bg-sky-50 dark:bg-sky-400/15", borde: "border-sky-500", texto: "text-sky-900 dark:text-sky-200", punto: "bg-sky-500" },
  { fondo: "bg-violet-50 dark:bg-violet-400/15", borde: "border-violet-500", texto: "text-violet-900 dark:text-violet-200", punto: "bg-violet-500" },
  { fondo: "bg-emerald-50 dark:bg-emerald-400/15", borde: "border-emerald-500", texto: "text-emerald-900 dark:text-emerald-200", punto: "bg-emerald-500" },
  { fondo: "bg-amber-50 dark:bg-amber-400/15", borde: "border-amber-500", texto: "text-amber-900 dark:text-amber-200", punto: "bg-amber-500" },
  { fondo: "bg-rose-50 dark:bg-rose-400/15", borde: "border-rose-500", texto: "text-rose-900 dark:text-rose-200", punto: "bg-rose-500" },
  { fondo: "bg-cyan-50 dark:bg-cyan-400/15", borde: "border-cyan-600", texto: "text-cyan-900 dark:text-cyan-200", punto: "bg-cyan-600" },
  { fondo: "bg-lime-50 dark:bg-lime-400/15", borde: "border-lime-600", texto: "text-lime-900 dark:text-lime-200", punto: "bg-lime-600" },
  { fondo: "bg-fuchsia-50 dark:bg-fuchsia-400/15", borde: "border-fuchsia-500", texto: "text-fuchsia-900 dark:text-fuchsia-200", punto: "bg-fuchsia-500" },
];
export const colorMateria = (i: number) => COLORES_MATERIA[((i % COLORES_MATERIA.length) + COLORES_MATERIA.length) % COLORES_MATERIA.length];

export const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};
export const aHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Convierte un bloque con horas en texto ("07:00") al formato de la cuadrícula. */
export function aBloqueGrid(b: { dia: DiaSemana; inicio: string; fin: string; clave: string; nombre: string; grupo?: string; salon?: string | null }, colorIndice: number): BloqueGrid {
  return { ...b, inicioMin: aMinutos(b.inicio), finMin: aMinutos(b.fin), colorIndice };
}

/** Día de hoy como DiaSemana (null si es domingo). */
export function diaDeHoy(fecha = new Date()): DiaSemana | null {
  const d = fecha.getDay(); // 0 = domingo
  return d === 0 ? null : DIAS_ORDEN[d - 1];
}

const ALTO_HORA = 64; // px por hora

interface Props {
  bloques: BloqueGrid[];
  dias: DiaSemana[];
  horaInicio: number;
  horaFin: number;
  /** Resalta el día actual y dibuja la línea de "ahora". Desactívalo en el Generador. */
  marcarHoy?: boolean;
  className?: string;
}

export default function HorarioGrid({ bloques, dias, horaInicio, horaFin, marcarHoy = true, className }: Props) {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    if (!marcarHoy) return;
    const t = window.setInterval(() => setAhora(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, [marcarHoy]);

  const horas = Array.from({ length: Math.max(1, horaFin - horaInicio) }, (_, i) => horaInicio + i);
  const hoy = marcarHoy ? diaDeHoy(ahora) : null;
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const lineaVisible = hoy && minAhora >= horaInicio * 60 && minAhora <= horaFin * 60;

  return (
    <div className={clsx("overflow-x-auto rounded-[22px] bg-superficie", className)}>
      <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `56px repeat(${dias.length}, minmax(0, 1fr))` }}>
        {/* Encabezados */}
        <div className="sticky top-0 border-b border-slate-200 bg-superficie" />
        {dias.map((d) => (
          <div key={d} className={clsx("border-b border-l border-slate-200 py-3 text-center text-sm font-bold", d === hoy ? "bg-marca-50 text-marca-700" : "text-slate-600")}>
            {NOMBRE_DIA[d]}
            {d === hoy && <span className="ml-1.5 rounded-full bg-marca-700 px-1.5 py-0.5 text-[10px] font-bold text-white">HOY</span>}
          </div>
        ))}

        {/* Columna de horas */}
        <div className="relative" style={{ height: horas.length * ALTO_HORA }}>
          {horas.map((h, i) => (
            <div key={h} className={clsx("absolute right-2 text-xs font-medium tabular-nums text-slate-400", i === 0 ? "translate-y-1" : "-translate-y-1/2")} style={{ top: i * ALTO_HORA }}>
              {`${String(h).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {/* Columnas por día */}
        {dias.map((d) => (
          <div key={d} className={clsx("relative border-l border-slate-200", d === hoy && "bg-marca-50/40")} style={{ height: horas.length * ALTO_HORA }}>
            {horas.map((h, i) => (
              <div key={h} className="absolute inset-x-0 border-t border-dashed border-slate-100" style={{ top: i * ALTO_HORA }} />
            ))}

            {bloques.filter((b) => b.dia === d).map((b) => {
              const c = colorMateria(b.colorIndice);
              const top = ((b.inicioMin - horaInicio * 60) / 60) * ALTO_HORA;
              const alto = ((b.finMin - b.inicioMin) / 60) * ALTO_HORA;
              return (
                <div
                  key={`${b.clave}-${b.inicioMin}`}
                  title={`${tituloBonito(b.nombre)} · ${aHora(b.inicioMin)}–${aHora(b.finMin)}${b.salon ? ` · ${b.salon}` : ""}`}
                  className={clsx("absolute inset-x-1 overflow-hidden rounded-[10px] border-l-[3px] px-2 py-1.5", c.fondo, c.borde, c.texto)}
                  style={{ top: top + 2, height: alto - 4 }}
                >
                  <p className="line-clamp-2 text-xs font-bold leading-tight">{tituloBonito(b.nombre)}</p>
                  {alto >= 56 && (
                    <p className="mt-0.5 text-[11px] opacity-80">
                      {aHora(b.inicioMin)}–{aHora(b.finMin)}{b.salon ? ` · ${b.salon}` : ""}
                    </p>
                  )}
                </div>
              );
            })}

            {lineaVisible && d === hoy && (
              <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((minAhora - horaInicio * 60) / 60) * ALTO_HORA }}>
                <div className="-ml-1 size-2 rounded-full bg-bajo" />
                <div className="h-0.5 flex-1 bg-bajo" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
