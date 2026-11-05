// Calificaciones (Persona B) — CONTEXTO.md §10, B1.
// Dos pestañas: "Periodo actual" (useCalificaciones) e "Historial" (useKardex).
// Filtro en tiempo real por nombre/clave y por periodo; colores de semáforo con estiloDesempeno.

import clsx from "clsx";
import { BookOpenCheck, History, Search, X } from "lucide-react";
import { type ReactNode, useDeferredValue, useMemo, useState } from "react";
import { useCalificaciones, useKardex } from "../api/hooks";
import { Badge, Calificacion, Card, EncabezadoPagina, ErrorState, Skeleton } from "../components/ui";
import { desempenoDe, estiloDesempeno, tituloBonito } from "../lib/desempeno";
import { coincide, normalizarTexto, tonoTipo } from "../lib/formato";
import type { Desempeno, MateriaEnCurso, MateriaKardex } from "../types/api";

type Pestana = "actual" | "historial";
type FiltroDesempeno = Desempeno | "todas";

export default function Calificaciones() {
  const [pestana, setPestana] = useState<Pestana>("actual");
  const [texto, setTexto] = useState("");
  const [periodo, setPeriodo] = useState("todos");
  const [nivel, setNivel] = useState<FiltroDesempeno>("todas");

  // useDeferredValue mantiene el input fluido aunque la lista sea larga
  const busqueda = normalizarTexto(useDeferredValue(texto).trim());

  const actual = useCalificaciones();
  const kardex = useKardex();

  const materiasActuales = useMemo(
    () => (actual.data?.materias ?? []).filter(
      (m) => coincide(busqueda, m.nombre, m.clave) && (nivel === "todas" || m.desempeno === nivel),
    ),
    [actual.data, busqueda, nivel],
  );

  const historial = useMemo(
    () => (kardex.data?.materias ?? [])
      .filter((m) =>
        coincide(busqueda, m.nombre, m.clave)
        && (periodo === "todos" || m.periodo === periodo)
        && (nivel === "todas" || m.desempeno === nivel))
      // lo más reciente primero
      .toReversed(),
    [kardex.data, busqueda, periodo, nivel],
  );

  const hayFiltros = texto !== "" || periodo !== "todos" || nivel !== "todas";
  const limpiar = () => { setTexto(""); setPeriodo("todos"); setNivel("todas"); };

  const subtitulo = actual.data?.periodo
    ? `Periodo actual: ${actual.data.periodo.descripcion}`
    : "Tu desempeño del periodo y tu historial completo";

  return (
    <div>
      <EncabezadoPagina titulo="Calificaciones" subtitulo={subtitulo} />

      {/* Pestañas */}
      <div role="tablist" className="mb-4 inline-flex gap-1 rounded-xl bg-slate-100 p-1">
        <BotonPestana activa={pestana === "actual"} onClick={() => setPestana("actual")} icono={<BookOpenCheck className="size-4" />}>
          Periodo actual
          {actual.data && <Contador n={actual.data.materias.length} />}
        </BotonPestana>
        <BotonPestana activa={pestana === "historial"} onClick={() => setPestana("historial")} icono={<History className="size-4" />}>
          Historial
          {kardex.data && <Contador n={kardex.data.materias.length} />}
        </BotonPestana>
      </div>

      {/* Filtros: se aplican en cada tecla, sin botón de buscar */}
      <Card className="mb-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Buscar materia</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por materia o clave…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-9 text-sm outline-none transition focus:border-marca-500 focus:bg-white focus:ring-2 focus:ring-marca-100"
          />
        </label>

        {pestana === "historial" && (
          <label className="sm:w-52">
            <span className="sr-only">Periodo</span>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-marca-500 focus:ring-2 focus:ring-marca-100"
            >
              <option value="todos">Todos los periodos</option>
              {kardex.data?.periodos.toReversed().map((p) => <option key={p.clave} value={p.clave}>{p.texto}</option>)}
            </select>
          </label>
        )}

        <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtrar por desempeño">
          {(["alto", "medio", "bajo"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setNivel(nivel === d ? "todas" : d)}
              aria-pressed={nivel === d}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                nivel === d
                  ? clsx(estiloDesempeno[d].fondo, estiloDesempeno[d].texto, estiloDesempeno[d].borde)
                  : "border-slate-200 text-slate-500 hover:bg-slate-50",
              )}
            >
              <span className={clsx("size-2 rounded-full", estiloDesempeno[d].punto)} />
              {estiloDesempeno[d].etiqueta}
            </button>
          ))}
          {hayFiltros && (
            <button onClick={limpiar} className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700">
              <X className="size-3.5" /> Limpiar
            </button>
          )}
        </div>
      </Card>

      {pestana === "actual" ? (
        actual.isPending ? <SkeletonTarjetas />
          : actual.error ? <ErrorState mensaje={actual.error.message} onReintentar={() => actual.refetch()} />
          : actual.data.materias.length === 0 ? <Vacio mensaje="No tienes materias inscritas en el periodo actual." />
          : materiasActuales.length === 0 ? <Vacio mensaje="Ninguna materia coincide con los filtros." onLimpiar={limpiar} />
          : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {materiasActuales.map((m) => <TarjetaMateria key={m.idGrupo} m={m} />)}
            </div>
          )
      ) : (
        kardex.isPending ? <SkeletonTabla />
          : kardex.error ? <ErrorState mensaje={kardex.error.message} onReintentar={() => kardex.refetch()} />
          : historial.length === 0 ? <Vacio mensaje="Ninguna materia coincide con los filtros." onLimpiar={hayFiltros ? limpiar : undefined} />
          : <TablaHistorial materias={historial} total={kardex.data.materias.length} />
      )}
    </div>
  );
}

// ---------------- Periodo actual ----------------

function TarjetaMateria({ m }: { m: MateriaEnCurso }) {
  const e = estiloDesempeno[m.desempeno];
  const total = m.unidades.length || 4;
  return (
    <Card className="relative flex flex-col gap-4 overflow-hidden pl-6">
      <div className={clsx("absolute inset-y-0 left-0 w-1.5", e.punto)} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-400">{m.clave} · Grupo {m.grupo}</p>
          <h3 className="mt-1 leading-snug font-bold text-slate-900">{tituloBonito(m.nombre)}</h3>
        </div>
        <Badge tono="marca" className="shrink-0">En curso</Badge>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: Math.max(4, m.unidades.length) }, (_, i) => {
          const u = m.unidades.find((x) => x.numero === i + 1);
          const c = u?.calificacion ?? null;
          const eu = c === null ? null : estiloDesempeno[desempenoDe(c)];
          return (
            <div key={i} className={clsx("rounded-xl border px-2 py-2 text-center", eu ? clsx(eu.fondo, eu.borde) : "border-dashed border-slate-200")}>
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">U{i + 1}</p>
              <p className={clsx("text-lg font-bold tabular-nums", eu ? eu.texto : "text-slate-300")}>{c ?? "—"}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="flex-1">
          <p className="text-xs text-slate-500">{m.unidadesCapturadas} de {total} unidades capturadas</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={clsx("h-full rounded-full", e.punto)} style={{ width: `${(m.unidadesCapturadas / total) * 100}%` }} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Promedio parcial</p>
          <Calificacion valor={m.promedioActual} desempeno={m.desempeno} className="mt-0.5 text-lg" />
        </div>
      </div>
    </Card>
  );
}

// ---------------- Historial ----------------

function TablaHistorial({ materias, total }: { materias: MateriaKardex[]; total: number }) {
  return (
    <Card className="overflow-hidden p-0!">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
        <span>Mostrando <b className="text-slate-800">{materias.length}</b> de {total} registros</span>
        <span className="hidden sm:inline">Calificación final de cada intento</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-5 py-3">Materia</th>
              <th className="px-3 py-3">Periodo</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3 text-center">Créditos</th>
              <th className="px-5 py-3 text-right">Calificación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {materias.map((m) => (
              <tr key={`${m.clave}-${m.periodo}`} className={clsx("transition hover:bg-slate-50", !m.acreditada && "bg-bajo-suave/40")}>
                <td className="px-5 py-3">
                  <p className="font-semibold text-slate-800">{tituloBonito(m.nombre)}</p>
                  <p className="text-xs text-slate-400">{m.clave}</p>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-slate-600">{m.periodoTexto}</td>
                <td className="px-3 py-3"><Badge tono={tonoTipo[m.tipo].tono}>{tonoTipo[m.tipo].texto}</Badge></td>
                <td className="px-3 py-3 text-center text-slate-600 tabular-nums">{m.creditos}</td>
                <td className="px-5 py-3 text-right"><Calificacion desempeno={m.desempeno} texto={m.textoCalificacion} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------- Piezas pequeñas ----------------

function BotonPestana({ activa, onClick, icono, children }: { activa: boolean; onClick: () => void; icono: ReactNode; children: ReactNode }) {
  return (
    <button
      role="tab" aria-selected={activa} onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
        activa ? "bg-white text-marca-700 shadow-sm" : "text-slate-500 hover:text-slate-800",
      )}
    >
      {icono}{children}
    </button>
  );
}

const Contador = ({ n }: { n: number }) => (
  <span className="rounded-full bg-slate-200/70 px-1.5 text-[11px] text-slate-600 tabular-nums">{n}</span>
);

function Vacio({ mensaje, onLimpiar }: { mensaje: string; onLimpiar?: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 border-dashed py-12 text-center">
      <Search className="size-8 text-slate-300" />
      <p className="text-slate-500">{mensaje}</p>
      {onLimpiar && <button onClick={onLimpiar} className="text-sm font-semibold text-marca-600 hover:underline">Limpiar filtros</button>}
    </Card>
  );
}

function SkeletonTarjetas() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i} className="flex flex-col gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-3/4" />
          <div className="grid grid-cols-4 gap-2">{Array.from({ length: 4 }, (_, j) => <Skeleton key={j} className="h-14" />)}</div>
          <Skeleton className="h-8 w-full" />
        </Card>
      ))}
    </div>
  );
}

function SkeletonTabla() {
  return (
    <Card className="flex flex-col gap-3">
      {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </Card>
  );
}
