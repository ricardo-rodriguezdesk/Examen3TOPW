// Componentes de interfaz compartidos. Úsalos en todas las páginas para que la app se vea consistente.

import clsx from "clsx";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import type { Desempeno } from "../../types/api";
import { estiloDesempeno } from "../../lib/desempeno";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("rounded-[22px] bg-superficie p-5", className)}>{children}</div>;
}

/** Bloque gris animado para estados de carga. Dale tamaño con className: <Skeleton className="h-6 w-40" /> */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-relleno", className)} />;
}

type TonoBadge = "neutro" | "marca" | "alto" | "medio" | "bajo";
const tonos: Record<TonoBadge, string> = {
  neutro: "bg-relleno text-slate-600",
  marca: "bg-marca-50 text-marca-700",
  alto: "bg-alto-suave text-alto",
  medio: "bg-medio-suave text-medio",
  bajo: "bg-bajo-suave text-bajo",
};
export function Badge({ children, tono = "neutro", className }: { children: ReactNode; tono?: TonoBadge; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold", tonos[tono], className)}>
      {children}
    </span>
  );
}

/** Calificación con su color de semáforo. */
export function Calificacion({ valor, desempeno, texto, className }: { valor?: number | null; desempeno: Desempeno; texto?: string; className?: string }) {
  const e = estiloDesempeno[desempeno];
  return (
    <span className={clsx("inline-flex min-w-11 justify-center rounded-full px-2.5 py-0.5 text-[15px] font-semibold tabular-nums", e.fondo, e.texto, className)}>
      {texto ?? (valor === null || valor === undefined ? "—" : valor)}
    </span>
  );
}

export function ErrorState({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-bajo-suave"><AlertTriangle className="size-7 text-bajo" /></div>
      <p className="max-w-md text-slate-600">{mensaje}</p>
      {onReintentar && (
        <button onClick={onReintentar} className="inline-flex items-center gap-2 rounded-full bg-marca-700 px-5 py-2 text-[15px] font-semibold text-white transition hover:bg-marca-800 active:scale-[0.97]">
          <RefreshCw className="size-4" /> Reintentar
        </button>
      )}
    </Card>
  );
}

export function EncabezadoPagina({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div>
        <h1 className="text-[34px] leading-[41px] font-bold tracking-[0.01em] text-slate-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 max-w-2xl text-[15px] text-slate-500">{subtitulo}</p>}
      </div>
      {children}
    </div>
  );
}

/** Para las páginas que todavía no se implementan. */
export function Pendiente({ titulo, responsable, notas }: { titulo: string; responsable: "A" | "B"; notas: string[] }) {
  return (
    <div>
      <EncabezadoPagina titulo={titulo} subtitulo={`Pendiente — Persona ${responsable}`} />
      <Card className="border-dashed">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          {notas.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </Card>
    </div>
  );
}
