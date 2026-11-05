// Administración · Demanda de grupos (Persona B) — CONTEXTO.md §0A y §7.2.
// Cuántos alumnos planean cada grupo (lo guardan desde el Generador), ocupación contra el cupo y
// una recomendación por materia para la coordinación: abrir otro grupo, redistribuir, demanda baja o sin demanda.
// Privacidad: solo conteos; el backend nunca guarda quién eligió qué.

import clsx from "clsx";
import { RefreshCw, Search, ShieldCheck, Trash2, TrendingUp, UserRound, Users } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useBorrarSimulados, useDemanda, useRegenerarSimulados } from "../../api/admin";
import { Card, EncabezadoPagina, ErrorState, Skeleton } from "../../components/ui";
import { tituloBonito } from "../../lib/desempeno";
import { coincide, normalizarTexto } from "../../lib/formato";
import type { DemandaGrupo, DemandaMateria, NivelOcupacion } from "../../types/api";
import { Boton, Confirmar } from "./componentes";

type Recomendacion = NonNullable<DemandaMateria["recomendacion"]>["tipo"];

const RECOMENDACION: Record<Recomendacion, { texto: string; clase: string }> = {
  abrir: { texto: "Abrir otro grupo", clase: "bg-bajo-suave text-bajo" },
  redistribuir: { texto: "Redistribuir", clase: "bg-medio-suave text-medio" },
  baja: { texto: "Demanda baja", clase: "bg-relleno text-slate-600" },
  sin_demanda: { texto: "Sin demanda", clase: "bg-relleno text-slate-400" },
};

const NIVEL: Record<NivelOcupacion, { barra: string; texto: string; etiqueta: string }> = {
  lleno: { barra: "bg-bajo", texto: "text-bajo", etiqueta: "Lleno" },
  alto: { barra: "bg-medio", texto: "text-medio", etiqueta: "Casi lleno" },
  normal: { barra: "bg-alto", texto: "text-alto", etiqueta: "Normal" },
  bajo: { barra: "bg-slate-400", texto: "text-slate-500", etiqueta: "Bajo" },
};

type Filtro = "atencion" | "todas" | "baja";

export default function AdminDemanda() {
  const [simulados, setSimulados] = useState(true);
  const demanda = useDemanda(simulados ? {} : { simulados: false });
  const regenerar = useRegenerarSimulados();
  const borrar = useBorrarSimulados();
  const [confirmar, setConfirmar] = useState<"regenerar" | "borrar" | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("atencion");
  const [texto, setTexto] = useState("");
  const busqueda = normalizarTexto(useDeferredValue(texto).trim());

  const materias = useMemo(() => (demanda.data?.materias ?? []).filter((m) => {
    const t = m.recomendacion?.tipo;
    const pasa = filtro === "todas" || (filtro === "atencion" ? t === "abrir" || t === "redistribuir" : t === "baja" || t === "sin_demanda");
    return pasa && coincide(busqueda, m.clave, m.nombre);
  }), [demanda.data, filtro, busqueda]);

  const cuenta = (f: Filtro) => (demanda.data?.materias ?? []).filter((m) => {
    const t = m.recomendacion?.tipo;
    return f === "todas" || (f === "atencion" ? t === "abrir" || t === "redistribuir" : t === "baja" || t === "sin_demanda");
  }).length;

  const accion = confirmar === "regenerar" ? regenerar : borrar;

  return (
    <div>
      <EncabezadoPagina
        titulo="Demanda de grupos"
        subtitulo={`${demanda.data?.periodoTexto ?? "Próximo periodo"}: cuántos alumnos planean cada grupo según los horarios que guardan en el Generador`}
      />

      {/* Controles de los datos de demostración */}
      <div className="mb-5 flex flex-col gap-3 rounded-[18px] bg-superficie p-4 sm:flex-row sm:items-center">
        <label className="flex flex-1 cursor-pointer items-center gap-3">
          <input type="checkbox" className="peer sr-only" checked={simulados} onChange={(e) => setSimulados(e.target.checked)} />
          <span className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-relleno transition peer-checked:bg-[#34c759] peer-focus-visible:ring-2 peer-focus-visible:ring-marca-200 after:absolute after:top-0.5 after:left-0.5 after:size-[27px] after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
          <span>
            <span className="block text-[15px] font-semibold text-slate-900">Incluir datos simulados</span>
            <span className="block text-[13px] text-slate-500">Alumnos ficticios para la demostración; apágalo para ver solo alumnos reales.</span>
          </span>
        </label>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => { regenerar.reset(); setConfirmar("regenerar"); }}><RefreshCw className="size-4" /> Regenerar</Boton>
          <Boton variante="secundario" className="text-bajo!" onClick={() => { borrar.reset(); setConfirmar("borrar"); }}><Trash2 className="size-4" /> Borrar simulados</Boton>
        </div>
      </div>

      {demanda.isPending ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-[22px]" />)}</div>
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40 rounded-[22px]" />)}
        </div>
      ) : demanda.error ? (
        <ErrorState mensaje={demanda.error.message} onReintentar={() => demanda.refetch()} />
      ) : (
        <>
          {/* Resumen */}
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Resumen icono={Users} titulo="Alumnos que planearon" valor={demanda.data.resumen.alumnos}
              detalle={demanda.data.incluyeSimulados ? `${demanda.data.resumen.alumnosReales} reales · ${demanda.data.resumen.alumnosSimulados} simulados` : "Solo alumnos reales"} />
            <Resumen icono={TrendingUp} titulo="Grupos llenos" valor={demanda.data.resumen.gruposLlenos} alerta={demanda.data.resumen.gruposLlenos > 0} detalle="Planeados ≥ cupo" />
            <Resumen icono={UserRound} titulo="Materias con faltante" valor={demanda.data.resumen.materiasConFaltante} alerta={demanda.data.resumen.materiasConFaltante > 0} detalle="Más alumnos que lugares" />
            <Resumen icono={UserRound} titulo="Lugares faltantes" valor={demanda.data.resumen.lugaresFaltantes} alerta={demanda.data.resumen.lugaresFaltantes > 0} detalle="Para cubrir toda la demanda" />
          </div>

          {demanda.data.porEspecialidad.length > 0 && <PorEspecialidad datos={demanda.data.porEspecialidad} total={demanda.data.resumen.alumnos} />}

          {/* Filtros */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div role="tablist" className="segmentado">
              {([["atencion", "Necesitan atención"], ["baja", "Poca demanda"], ["todas", "Todas"]] as [Filtro, string][]).map(([f, t]) => (
                <button key={f} role="tab" aria-selected={filtro === f} onClick={() => setFiltro(f)} className="segmento">
                  {t} <span className="text-[12px] font-medium text-slate-500 tabular-nums">{cuenta(f)}</span>
                </button>
              ))}
            </div>
            <label className="relative flex-1">
              <span className="sr-only">Buscar materia</span>
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-[17px] -translate-y-1/2 text-slate-500" />
              <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar materia o clave" className="campo pl-8" />
            </label>
          </div>

          {demanda.data.resumen.alumnos === 0 ? (
            <Card className="py-14 text-center text-[15px] text-slate-500">
              Todavía nadie ha guardado su horario para {demanda.data.periodoTexto}.
            </Card>
          ) : materias.length === 0 ? (
            <Card className="py-14 text-center text-[15px] text-slate-500">
              {filtro === "atencion" ? "Ninguna materia necesita atención: la oferta cubre la demanda." : "No hay materias con esos filtros."}
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {materias.map((m) => <TarjetaMateria key={m.clave} m={m} />)}
            </div>
          )}

          <p className="mt-6 flex items-center justify-center gap-1.5 text-[13px] text-slate-500">
            <ShieldCheck className="size-4" /> Solo se muestran conteos. El sistema no guarda quién eligió cada grupo.
          </p>
        </>
      )}

      <Confirmar
        abierto={confirmar !== null}
        titulo={confirmar === "regenerar" ? "Regenerar datos simulados" : "Borrar datos simulados"}
        mensaje={confirmar === "regenerar"
          ? <>Se reemplazarán los alumnos simulados por <b>150 nuevos</b>. Los horarios de alumnos reales no se tocan.</>
          : <>Se borrarán <b>todos los alumnos simulados</b> del periodo. La demanda quedará solo con alumnos reales.</>}
        textoConfirmar={confirmar === "regenerar" ? "Regenerar" : "Borrar"}
        peligro={confirmar === "borrar"}
        onCancelar={() => setConfirmar(null)}
        onConfirmar={() => {
          const cerrar = { onSuccess: () => setConfirmar(null) };
          if (confirmar === "regenerar") regenerar.mutate(150, cerrar); else borrar.mutate(undefined, cerrar);
        }}
        cargando={accion.isPending}
        error={accion.error?.message}
      />
    </div>
  );
}

// ---------------- Piezas ----------------

function Resumen({ icono: Icono, titulo, valor, detalle, alerta }: { icono: typeof Users; titulo: string; valor: number; detalle: string; alerta?: boolean }) {
  return (
    <Card className="p-4">
      <p className={clsx("flex items-center gap-1.5 text-[13px] font-semibold", alerta ? "text-bajo" : "text-marca-500")}><Icono className="size-[15px]" /> {titulo}</p>
      <p className={clsx("mt-1 text-[34px] leading-tight font-bold tabular-nums", alerta ? "text-bajo" : "text-slate-900")}>{valor}</p>
      <p className="text-[13px] text-slate-500">{detalle}</p>
    </Card>
  );
}

function PorEspecialidad({ datos, total }: { datos: { especialidad: string; alumnos: number }[]; total: number }) {
  return (
    <Card className="mb-5">
      <h2 className="text-[17px] font-semibold text-slate-900">Alumnos por especialidad</h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {datos.map((e) => (
          <li key={e.especialidad} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,16rem)_1fr_auto]">
            <span className="truncate text-[14px] text-slate-700">{e.especialidad}</span>
            <span className="order-last col-span-2 h-2 overflow-hidden rounded-full bg-relleno sm:order-none sm:col-span-1">
              <span className="block h-full rounded-full bg-marca-500" style={{ width: `${total ? (e.alumnos / total) * 100 : 0}%` }} />
            </span>
            <span className="text-[14px] font-semibold text-slate-900 tabular-nums">{e.alumnos}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TarjetaMateria({ m }: { m: DemandaMateria }) {
  const r = m.recomendacion;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold text-slate-900">{tituloBonito(m.nombre)}</h3>
          <p className="text-[13px] text-slate-500">{m.clave} · Semestre {m.semestre}</p>
        </div>
        <div className="text-right">
          <p className="text-[22px] leading-none font-bold text-slate-900 tabular-nums">
            {m.planeados}<span className="text-[15px] font-medium text-slate-500"> / {m.cupoTotal}</span>
          </p>
          <p className="mt-1 text-[12px] text-slate-500">planeados / cupo total</p>
        </div>
      </div>

      {r && (
        <div className={clsx("flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[12px] px-3 py-2 text-[14px]", RECOMENDACION[r.tipo].clase)}>
          <b>{RECOMENDACION[r.tipo].texto}</b>
          <span className="text-slate-700">{r.mensaje}</span>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {m.grupos.map((g) => <BarraGrupo key={g.id} g={g} />)}
      </ul>
    </Card>
  );
}

/** Barra de ocupación del grupo. Si pasa del cupo, la barra se llena y el excedente se indica con un "+". */
function BarraGrupo({ g }: { g: DemandaGrupo }) {
  const n = NIVEL[g.nivel];
  const pct = Math.round(g.ocupacion * 100);
  const excede = g.planeados - g.cupo;
  return (
    <li className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
      <span className="grid size-8 place-items-center rounded-[10px] bg-relleno text-[14px] font-bold text-slate-700">{g.grupo}</span>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2 text-[13px]">
          <span className="truncate text-slate-500">{g.docente ?? "Docente por asignar"}</span>
          <span className={clsx("shrink-0 font-semibold tabular-nums", n.texto)}>{n.etiqueta} · {pct} %</span>
        </div>
        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-relleno" role="img" aria-label={`Grupo ${g.grupo}: ${g.planeados} de ${g.cupo} lugares (${pct} %)`}>
          <div className={clsx("h-full rounded-full", n.barra)} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      </div>
      <span className="text-right text-[14px] font-semibold text-slate-900 tabular-nums">
        {g.planeados}/{g.cupo}
        {excede > 0 && <span className="block text-[12px] font-semibold text-bajo">+{excede}</span>}
      </span>
    </li>
  );
}
