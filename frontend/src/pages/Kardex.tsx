// Kardex (Persona B) — CONTEXTO.md §10, B2.
// Tarjetas resumen, gráfica del promedio por semestre y secciones por semestre que se abren y cierran.

import clsx from "clsx";
import { Award, ChevronRight, ChevronsDownUp, ChevronsUpDown, Layers, RotateCcw, TrendingUp, type LucideIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useKardex } from "../api/hooks";
import { Badge, Calificacion, Card, EncabezadoPagina, ErrorState, Skeleton } from "../components/ui";
import { desempenoDe, estiloDesempeno, tituloBonito } from "../lib/desempeno";
import { tonoTipo } from "../lib/formato";
import type { Kardex as TKardex, SemestreKardex } from "../types/api";


export default function Kardex() {
  const { data, isPending, error, refetch } = useKardex();
  const [abiertos, setAbiertos] = useState<Set<number> | null>(null); // null = estado inicial (último semestre abierto)

  if (isPending) return <SkeletonKardex />;
  if (error) {
    return (
      <div>
        <EncabezadoPagina titulo="Kardex" />
        <ErrorState mensaje={error.message} onReintentar={() => refetch()} />
      </div>
    );
  }

  const ultimo = data.semestres.at(-1)?.semestre;
  const abiertosEf = abiertos ?? new Set(ultimo ? [ultimo] : []);
  const todosAbiertos = abiertosEf.size === data.semestres.length;
  const alternar = (s: number) => {
    const n = new Set(abiertosEf);
    if (n.has(s)) n.delete(s); else n.add(s);
    setAbiertos(n);
  };

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Kardex" subtitulo="Historial académico completo, semestre por semestre" />

      <Resumen k={data} />

      <Card>
        <h2 className="text-[17px] font-semibold text-slate-900">Promedio por semestre</h2>
        <p className="mb-3 text-[13px] text-slate-500">Solo materias acreditadas con calificación numérica</p>
        <GraficaPromedios semestres={data.semestres} />
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="px-1 text-[22px] font-bold text-slate-900">Materias por semestre</h2>
          <button
            onClick={() => setAbiertos(todosAbiertos ? new Set() : new Set(data.semestres.map((s) => s.semestre)))}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px] font-medium text-marca-500 hover:bg-relleno"
          >
            {todosAbiertos ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
            {todosAbiertos ? "Cerrar todos" : "Abrir todos"}
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {data.semestres.map((s) => (
            <SeccionSemestre key={s.semestre} s={s} abierto={abiertosEf.has(s.semestre)} onAlternar={() => alternar(s.semestre)} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------- Resumen ----------------

function Resumen({ k }: { k: TKardex }) {
  const repeticion = k.materias.filter((m) => m.tipo === "repeticion").length;
  const especial = k.materias.filter((m) => m.tipo === "especial").length;
  const noAcreditadas = k.materias.filter((m) => !m.acreditada).length;
  const dp = estiloDesempeno[desempenoDe(k.promedioGeneral)];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="sm:col-span-2 lg:col-span-1">
        <Etiqueta icono={TrendingUp}>Avance de la carrera</Etiqueta>
        <p className="mt-1 text-[34px] leading-tight font-bold text-slate-900 tabular-nums">{k.porcentajeAvance.toFixed(1)}<span className="text-[20px] text-slate-500">%</span></p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-relleno" role="progressbar" aria-valuenow={k.porcentajeAvance} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-marca-500" style={{ width: `${Math.min(100, k.porcentajeAvance)}%` }} />
        </div>
      </Card>
      <Card>
        <Etiqueta icono={Layers}>Créditos acreditados</Etiqueta>
        <p className="mt-1 text-[34px] leading-tight font-bold text-slate-900 tabular-nums">{k.totalCreditosAcreditados}</p>
        <p className="mt-1 text-[13px] text-slate-500">{k.materias.filter((m) => m.acreditada).length} materias acreditadas</p>
      </Card>
      <Card>
        <Etiqueta icono={Award}>Promedio general</Etiqueta>
        <p className={clsx("mt-1 text-[34px] leading-tight font-bold tabular-nums", dp.texto)}>{k.promedioGeneral?.toFixed(2) ?? "—"}</p>
        <p className="mt-1 text-[13px] text-slate-500">{dp.etiqueta}</p>
      </Card>
      <Card>
        <Etiqueta icono={RotateCcw}>Repetición / especial</Etiqueta>
        <p className="mt-1 text-[34px] leading-tight font-bold text-slate-900 tabular-nums">{repeticion + especial}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Badge tono="medio">{repeticion} repetición</Badge>
          <Badge tono="bajo">{especial} especial</Badge>
          {noAcreditadas > 0 && <Badge tono="neutro">{noAcreditadas} NA</Badge>}
        </div>
      </Card>
    </div>
  );
}

function Etiqueta({ icono: Icono, children }: { icono: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-marca-500">
      <Icono className="size-[15px]" /> {children}
    </p>
  );
}

// ---------------- Gráfica ----------------

function GraficaPromedios({ semestres }: { semestres: SemestreKardex[] }) {
  const datos = semestres.map((s) => ({ nombre: `${s.semestre}.º`, semestre: s.semestre, promedio: s.promedio }));
  const valores = datos.map((d) => d.promedio).filter((v): v is number => v !== null);
  const min = Math.max(0, Math.floor((Math.min(...valores, 70) - 5) / 10) * 10);
  const ticks = Array.from({ length: (100 - min) / 10 + 1 }, (_, i) => min + i * 10);

  // Estilo Swift Charts: área suave bajo la línea, sin ejes pesados. Los colores salen del tema (CSS) para el modo oscuro.
  return (
    <div className="grafica-promedio h-64 w-full text-marca-500">
      <ResponsiveContainer>
        <AreaChart data={datos} margin={{ top: 12, right: 4, bottom: 0, left: 6 }}>
          <defs>
            <linearGradient id="relleno-promedio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="nombre" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis domain={[min, 100]} ticks={ticks} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} orientation="right" />
          <ReferenceLine y={70} className="linea-minima" strokeDasharray="4 4" label={{ value: "Mínima 70", position: "insideBottomLeft", fontSize: 11, className: "etiqueta-minima" }} />
          <Tooltip
            cursor={{ strokeOpacity: 0.3, stroke: "currentColor" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (typeof datos)[number] | undefined;
              if (!active || !p) return null;
              return (
                <div className="vidrio rounded-[12px] px-3 py-2">
                  <p className="text-[12px] text-slate-500">Semestre {p.semestre}</p>
                  <p className="text-[17px] font-semibold text-slate-900 tabular-nums">{p.promedio?.toFixed(2) ?? "Sin datos"}</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone" dataKey="promedio" stroke="currentColor" strokeWidth={2.5} fill="url(#relleno-promedio)" connectNulls
            dot={{ r: 3.5, fill: "currentColor", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "currentColor", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------- Secciones por semestre ----------------

function SeccionSemestre({ s, abierto, onAlternar }: { s: SemestreKardex; abierto: boolean; onAlternar: () => void }) {
  const d = desempenoDe(s.promedio);
  const id = `semestre-${s.semestre}`;
  return (
    <div className="overflow-hidden rounded-[22px] bg-superficie">
      <button
        onClick={onAlternar} aria-expanded={abierto} aria-controls={id}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-relleno"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold text-slate-900">Semestre {s.semestre}</p>
          <p className="text-[13px] text-slate-500">{s.materias.length} materias · {s.creditosAcreditados} créditos acreditados</p>
        </div>
        <span className={clsx("text-[17px] font-semibold tabular-nums", estiloDesempeno[d].texto)} title="Promedio del semestre">{s.promedio ?? "—"}</span>
        <ChevronRight className={clsx("size-5 shrink-0 text-slate-400 transition-transform duration-300", abierto && "rotate-90")} />
      </button>

      {abierto && (
        <ul id={id} className="border-t border-separador">
          {s.materias.map((m) => (
            <li key={`${m.clave}-${m.periodo}`} className="flex items-center pl-4 last:[&>div]:border-b-0">
              <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-separador py-2.5 pr-4">
                <div className="min-w-0 flex-1">
                  <p className={clsx("truncate text-[15px]", m.acreditada ? "text-slate-900" : "text-bajo")}>{tituloBonito(m.nombre)}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-slate-500">
                    {m.clave} · {m.periodoTexto} · {m.creditos} créditos
                    {m.tipo !== "ordinario" && <Badge tono={tonoTipo[m.tipo].tono}>{tonoTipo[m.tipo].texto}</Badge>}
                  </p>
                </div>
                <Calificacion desempeno={m.desempeno} texto={m.textoCalificacion} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------- Carga ----------------

function SkeletonKardex() {
  return (
    <div className="flex flex-col gap-6">
      <div><Skeleton className="h-8 w-40" /><Skeleton className="mt-2 h-4 w-72" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Card key={i}><Skeleton className="h-3 w-28" /><Skeleton className="mt-3 h-8 w-20" /><Skeleton className="mt-3 h-2 w-full" /></Card>)}
      </div>
      <Card><Skeleton className="h-64 w-full" /></Card>
      {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
    </div>
  );
}
