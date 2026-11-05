// Calificaciones (Persona B) — CONTEXTO.md §10, B1.
// Dos pestañas: "Periodo actual" (useCalificaciones) e "Historial" (useKardex).
// Filtro en tiempo real por nombre/clave y por periodo; colores de semáforo con estiloDesempeno.

import clsx from "clsx";
import { Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
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

      {/* Pestañas (control segmentado) */}
      <div role="tablist" className="segmentado mb-4">
        <button role="tab" aria-selected={pestana === "actual"} onClick={() => setPestana("actual")} className="segmento">
          Periodo actual {actual.data && <Contador n={actual.data.materias.length} />}
        </button>
        <button role="tab" aria-selected={pestana === "historial"} onClick={() => setPestana("historial")} className="segmento">
          Historial {kardex.data && <Contador n={kardex.data.materias.length} />}
        </button>
      </div>

      {/* Filtros: se aplican en cada tecla, sin botón de buscar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Buscar materia</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-[17px] -translate-y-1/2 text-slate-500" />
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar materia o clave" className="campo pl-8" />
        </label>

        {pestana === "historial" && (
          <label className="sm:w-52">
            <span className="sr-only">Periodo</span>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="campo">
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
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition",
                nivel === d ? clsx(estiloDesempeno[d].fondo, estiloDesempeno[d].texto) : "bg-relleno text-slate-700 hover:text-slate-900",
              )}
            >
              <span className={clsx("size-2 rounded-full", estiloDesempeno[d].punto)} />
              {estiloDesempeno[d].etiqueta}
            </button>
          ))}
          {hayFiltros && (
            <button onClick={limpiar} className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-[13px] font-semibold text-marca-500">
              <X className="size-3.5" /> Limpiar
            </button>
          )}
        </div>
      </div>

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
  const total = Math.max(4, m.unidades.length);
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] leading-snug font-semibold text-slate-900">{tituloBonito(m.nombre)}</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">{m.clave} · Grupo {m.grupo} · En curso</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={clsx("text-[28px] leading-none font-bold tabular-nums", e.texto)}>{m.promedioActual ?? "—"}</p>
          <p className="mt-1 text-[11px] text-slate-500">Promedio parcial</p>
        </div>
      </div>

      {/* Unidades: celdas sin borde; las pendientes se ven vacías */}
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const c = m.unidades.find((x) => x.numero === i + 1)?.calificacion ?? null;
          const eu = c === null ? null : estiloDesempeno[desempenoDe(c)];
          return (
            <div key={i} className={clsx("rounded-[12px] py-2 text-center", eu ? eu.fondo : "bg-relleno")}>
              <p className={clsx("text-[17px] font-semibold tabular-nums", eu ? eu.texto : "text-slate-400")}>{c ?? "—"}</p>
              <p className="text-[11px] text-slate-500">Unidad {i + 1}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------- Historial ----------------

/** Historial como lista agrupada (estilo Ajustes de iOS): se lee igual en celular que en computadora. */
function TablaHistorial({ materias, total }: { materias: MateriaKardex[]; total: number }) {
  return (
    <section>
      <p className="mb-2 px-4 text-[13px] text-slate-500">{materias.length} de {total} registros · calificación final de cada intento</p>
      <ul className="overflow-hidden rounded-[22px] bg-superficie">
        {materias.map((m) => (
          <li key={`${m.clave}-${m.periodo}`} className="flex items-center gap-3 pl-4 last:[&>div]:border-b-0">
            <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-separador py-3 pr-4">
              <div className="min-w-0 flex-1">
                <p className={clsx("truncate text-[15px] font-medium", m.acreditada ? "text-slate-900" : "text-bajo")}>{tituloBonito(m.nombre)}</p>
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
    </section>
  );
}

// ---------------- Piezas pequeñas ----------------

const Contador = ({ n }: { n: number }) => (
  <span className="text-[12px] font-medium text-slate-500 tabular-nums">{n}</span>
);

function Vacio({ mensaje, onLimpiar }: { mensaje: string; onLimpiar?: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-2 py-14 text-center">
      <Search className="size-9 text-slate-400" />
      <p className="text-[15px] text-slate-500">{mensaje}</p>
      {onLimpiar && <button onClick={onLimpiar} className="text-[15px] font-medium text-marca-500">Limpiar filtros</button>}
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
