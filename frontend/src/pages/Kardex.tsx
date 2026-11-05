// Kardex (Persona B) — CONTEXTO.md §10, B2.
// Tarjetas resumen, gráfica del promedio por semestre y secciones por semestre que se abren y cierran.

import clsx from "clsx";
import { Award, ChevronDown, ChevronsDownUp, ChevronsUpDown, Layers, RotateCcw, TrendingUp, type LucideIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useKardex } from "../api/hooks";
import { Badge, Calificacion, Card, EncabezadoPagina, ErrorState, Skeleton } from "../components/ui";
import { desempenoDe, estiloDesempeno, tituloBonito } from "../lib/desempeno";
import { tonoTipo } from "../lib/formato";
import type { Kardex as TKardex, SemestreKardex } from "../types/api";

const AZUL = "#2f5fa8"; // --color-marca-500

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
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold text-slate-900">Promedio por semestre</h2>
          <p className="text-xs text-slate-500">Solo materias acreditadas con calificación numérica</p>
        </div>
        <GraficaPromedios semestres={data.semestres} />
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Materias por semestre</h2>
          <button
            onClick={() => setAbiertos(todosAbiertos ? new Set() : new Set(data.semestres.map((s) => s.semestre)))}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-marca-600 hover:bg-marca-50"
          >
            {todosAbiertos ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
            {todosAbiertos ? "Cerrar todos" : "Abrir todos"}
          </button>
        </div>
        <div className="flex flex-col gap-3">
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
        <p className="mt-2 text-3xl font-extrabold text-slate-900 tabular-nums">{k.porcentajeAvance.toFixed(1)}%</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-marca-50" role="progressbar" aria-valuenow={k.porcentajeAvance} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-marca-500" style={{ width: `${Math.min(100, k.porcentajeAvance)}%` }} />
        </div>
      </Card>
      <Card>
        <Etiqueta icono={Layers}>Créditos acreditados</Etiqueta>
        <p className="mt-2 text-3xl font-extrabold text-slate-900 tabular-nums">{k.totalCreditosAcreditados}</p>
        <p className="mt-1 text-xs text-slate-500">{k.materias.filter((m) => m.acreditada).length} materias acreditadas</p>
      </Card>
      <Card>
        <Etiqueta icono={Award}>Promedio general</Etiqueta>
        <p className={clsx("mt-2 text-3xl font-extrabold tabular-nums", dp.texto)}>{k.promedioGeneral?.toFixed(2) ?? "—"}</p>
        <p className="mt-1 text-xs text-slate-500">{dp.etiqueta}</p>
      </Card>
      <Card>
        <Etiqueta icono={RotateCcw}>Repetición / especial</Etiqueta>
        <p className="mt-2 text-3xl font-extrabold text-slate-900 tabular-nums">{repeticion + especial}</p>
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
    <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
      <Icono className="size-4 text-marca-500" /> {children}
    </p>
  );
}

// ---------------- Gráfica ----------------

function GraficaPromedios({ semestres }: { semestres: SemestreKardex[] }) {
  const datos = semestres.map((s) => ({ nombre: `${s.semestre}.º`, semestre: s.semestre, promedio: s.promedio }));
  const valores = datos.map((d) => d.promedio).filter((v): v is number => v !== null);
  const min = Math.max(0, Math.floor((Math.min(...valores, 70) - 5) / 10) * 10);
  const ticks = Array.from({ length: (100 - min) / 10 + 1 }, (_, i) => min + i * 10);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={datos} margin={{ top: 16, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="nombre" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis domain={[min, 100]} ticks={ticks} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <ReferenceLine y={70} stroke="#b91c1c" strokeDasharray="4 4" label={{ value: "Mínima 70", position: "insideBottomRight", fill: "#b91c1c", fontSize: 11 }} />
          <Tooltip
            cursor={{ stroke: "#cbd5e1" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (typeof datos)[number] | undefined;
              if (!active || !p) return null;
              return (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
                  <p className="text-xs text-slate-500">Semestre {p.semestre}</p>
                  <p className="font-bold text-slate-900 tabular-nums">{p.promedio?.toFixed(2) ?? "Sin datos"}</p>
                </div>
              );
            }}
          />
          <Line
            type="monotone" dataKey="promedio" stroke={AZUL} strokeWidth={2} connectNulls
            dot={{ r: 4, fill: AZUL, stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: AZUL, stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------- Secciones por semestre ----------------

function SeccionSemestre({ s, abierto, onAlternar }: { s: SemestreKardex; abierto: boolean; onAlternar: () => void }) {
  const d = desempenoDe(s.promedio);
  const id = `semestre-${s.semestre}`;
  return (
    <Card className="overflow-hidden p-0!">
      <button
        onClick={onAlternar} aria-expanded={abierto} aria-controls={id}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-50 text-lg font-extrabold text-marca-700">{s.semestre}</div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900">Semestre {s.semestre}</p>
          <p className="text-sm text-slate-500">{s.materias.length} materias · {s.creditosAcreditados} créditos acreditados</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Promedio</p>
          <Calificacion valor={s.promedio} desempeno={d} />
        </div>
        <ChevronDown className={clsx("size-5 shrink-0 text-slate-400 transition-transform", abierto && "rotate-180")} />
      </button>

      {abierto && (
        <div id={id} className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2.5">Clave</th>
                <th className="px-3 py-2.5">Materia</th>
                <th className="px-3 py-2.5">Periodo</th>
                <th className="px-3 py-2.5 text-center">Créditos</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-5 py-2.5 text-right">Calificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {s.materias.map((m) => (
                <tr key={`${m.clave}-${m.periodo}`} className={clsx(!m.acreditada && "bg-bajo-suave/40")}>
                  <td className="px-5 py-2.5 font-mono text-xs whitespace-nowrap text-slate-500">{m.clave}</td>
                  <td className={clsx("px-3 py-2.5 font-semibold", m.acreditada ? "text-slate-800" : "text-bajo")}>{tituloBonito(m.nombre)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{m.periodoTexto}</td>
                  <td className="px-3 py-2.5 text-center text-slate-600 tabular-nums">{m.creditos}</td>
                  <td className="px-3 py-2.5"><Badge tono={tonoTipo[m.tipo].tono}>{tonoTipo[m.tipo].texto}</Badge></td>
                  <td className="px-5 py-2.5 text-right"><Calificacion desempeno={m.desempeno} texto={m.textoCalificacion} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
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
