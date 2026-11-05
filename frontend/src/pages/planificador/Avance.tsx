// Planificador · Avance (Persona B) — CONTEXTO.md §7 y §10 (B3).
// Créditos aprobados contra el total, egreso estimado, materias por estado y alertas.

import clsx from "clsx";
import { ArrowRight, CalendarCheck, CircleAlert, GraduationCap, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAvance } from "../../api/planificador";
import { Badge, Card, EncabezadoPagina, ErrorState, Skeleton } from "../../components/ui";
import { tituloBonito } from "../../lib/desempeno";
import { estiloEstado, ORDEN_ESTADOS, suavizarMayusculas, useEspecialidad } from "../../lib/planificador";
import type { Alerta as AlertaPlan, AvancePlan } from "../../types/api";

export default function Avance() {
  const { especialidad } = useEspecialidad();
  const { data, isPending, error, refetch } = useAvance(especialidad);

  if (isPending) return <SkeletonAvance />;
  if (error) return <ErrorState mensaje={error.message} onReintentar={() => refetch()} />;

  const { resumen, materias } = data;
  const { creditosCursando } = resumen;
  const pctCursando = (creditosCursando / resumen.creditosTotales) * 100;
  // Inscribibles: disponibles, o reprobadas sin seriación ni % pendiente (misma regla que el backend)
  const disponibles = materias.filter((m) => m.estado === "disponible" || (m.estado === "reprobada" && !m.requisitosPendientes.length && !m.faltaPorcentaje));

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Mi avance" subtitulo={`${data.plan.nombre} · Plan ${data.plan.clave}${data.especialidad ? ` · ${data.especialidad.nombre}` : ""}`} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Créditos */}
        <Card className="lg:col-span-2">
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <GraduationCap className="size-4 text-marca-500" /> Créditos de la carrera
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="text-[48px] leading-none font-bold tracking-tight text-slate-900 tabular-nums">{resumen.porcentaje}<span className="text-[26px] text-slate-500">%</span></p>
            <p className="pb-1.5 text-slate-500">
              <b className="text-slate-800 tabular-nums">{resumen.creditosAprobados}</b> de {resumen.creditosTotales} créditos aprobados
            </p>
          </div>

          <div className="mt-5 flex h-4 gap-0.5 overflow-hidden rounded-full bg-slate-100" role="img"
            aria-label={`${resumen.porcentaje}% aprobado, ${pctCursando.toFixed(1)}% cursando`}>
            <div className="rounded-l-full bg-alto" style={{ width: `${resumen.porcentaje}%` }} />
            <div className="bg-marca-500" style={{ width: `${pctCursando}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
            <Leyenda color="bg-alto">Aprobados · {resumen.creditosAprobados}</Leyenda>
            <Leyenda color="bg-marca-500">Cursando · {creditosCursando}</Leyenda>
            <Leyenda color="bg-slate-200">Por cursar · {resumen.creditosTotales - resumen.creditosAprobados - creditosCursando}</Leyenda>
          </div>
        </Card>

        {/* Egreso */}
        <Card className="flex flex-col bg-gradient-to-br from-[#3d9bff] to-[#0058c0] text-white shadow-[0_12px_30px_-12px_rgb(0_100_220/0.6)]">
          <p className="flex items-center gap-2 text-xs font-semibold text-marca-200">
            <CalendarCheck className="size-4" /> Egreso estimado
          </p>
          <p className="mt-2 text-[34px] leading-tight font-bold">{resumen.egresoEstimado}</p>
          <p className="mt-1 text-sm text-marca-200">
            Al ritmo de tus semestres anteriores
          </p>
          <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
            <div className="rounded-[16px] bg-white/15 p-3">
              <p className="text-2xl font-bold tabular-nums">{resumen.semestresCursados}</p>
              <p className="text-xs text-marca-200">semestres cursados</p>
            </div>
            <div className="rounded-[16px] bg-white/15 p-3">
              <p className="text-2xl font-bold tabular-nums">{resumen.semestresRestantesEstimados}</p>
              <p className="text-xs text-marca-200">restantes (estimado)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Materias por estado */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {ORDEN_ESTADOS.map((e) => {
          const n = materias.filter((m) => m.estado === e).length;
          return (
            <Link key={e} to={`/planificador/mapa?estado=${e}`} className="group">
              <Card className="h-full p-4 transition group-hover:bg-slate-50 group-active:scale-[0.98]">
                <span className={clsx("inline-block size-3 rounded-full", estiloEstado[e].punto)} />
                <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{n}</p>
                <p className="text-sm text-slate-500">{estiloEstado[e].etiqueta}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
        <Alertas alertas={data.alertas} />
        <ProximoSemestre materias={disponibles} />
      </div>
    </div>
  );
}

// ---------------- Alertas ----------------

const nivelAlerta: Record<AlertaPlan["nivel"], { icono: LucideIcon; clase: string; texto: string }> = {
  critica: { icono: OctagonAlert, clase: "bg-bajo-suave text-bajo", texto: "Crítica" },
  advertencia: { icono: TriangleAlert, clase: "bg-medio-suave text-medio", texto: "Advertencia" },
  info: { icono: Info, clase: "bg-marca-50 text-marca-700", texto: "Info" },
};

function Alertas({ alertas }: { alertas: AlertaPlan[] }) {
  return (
    <Card className="lg:col-span-3">
      <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
        <CircleAlert className="size-5 text-marca-500" /> Alertas
        <span className="text-sm font-normal text-slate-400">({alertas.length})</span>
      </h2>
      {alertas.length === 0 ? (
        <p className="text-sm text-slate-500">Todo en orden. No hay alertas para tu trayectoria.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {alertas.map((a, i) => {
            const n = nivelAlerta[a.nivel];
            const Icono = n.icono;
            return (
              <li key={i} className={clsx("flex gap-3 rounded-[16px] p-3", n.clase)}>
                <Icono className="mt-0.5 size-5 shrink-0" />
                <div className="min-w-0 text-sm">
                  <p className="text-[11px] font-bold">{n.texto}{a.clave && ` · ${a.clave}`}</p>
                  <p className="mt-0.5 text-slate-700">{suavizarMayusculas(a.mensaje)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}


// ---------------- Próximo semestre ----------------

function ProximoSemestre({ materias }: { materias: AvancePlan["materias"] }) {
  const conClase = materias.filter((m) => m.tipo !== "servicio" && m.tipo !== "residencia");
  return (
    <Card className="flex flex-col lg:col-span-2">
      <h2 className="font-bold text-slate-900">Puedes inscribir el próximo semestre</h2>
      <p className="mt-1 text-sm text-slate-500">{materias.length ? `${materias.length} materias sin seriación pendiente` : "No tienes materias por inscribir."}</p>
      <ul className="mt-4 flex flex-col divide-y divide-slate-100">
        {materias.map((m) => (
          <li key={m.clave} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{tituloBonito(m.nombre)}</p>
              <p className="text-xs text-slate-400">{m.clave} · {m.creditos} créditos</p>
            </div>
            {m.estado === "reprobada" ? <Badge tono="bajo">Repetición</Badge>
              : m.tipo === "especialidad" ? <Badge tono="marca">Especialidad</Badge>
              : m.tipo === "servicio" || m.tipo === "residencia" ? <Badge>Trámite</Badge> : null}
          </li>
        ))}
      </ul>
      {conClase.length > 0 && (
        <Link to="/planificador/generador"
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-marca-700 px-4 py-3 text-[15px] font-semibold text-white hover:bg-marca-800 sm:mt-4">
          Armar mi horario <ArrowRight className="size-4" />
        </Link>
      )}
    </Card>
  );
}

// ---------------- Piezas ----------------

const Leyenda = ({ color, children }: { color: string; children: ReactNode }) => (
  <span className="inline-flex items-center gap-2"><span className={clsx("size-2.5 rounded-full", color)} />{children}</span>
);

function SkeletonAvance() {
  return (
    <div className="flex flex-col gap-6">
      <div><Skeleton className="h-8 w-40" /><Skeleton className="mt-2 h-4 w-80" /></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><Skeleton className="h-3 w-40" /><Skeleton className="mt-4 h-12 w-48" /><Skeleton className="mt-5 h-4 w-full" /></Card>
        <Skeleton className="h-48 rounded-[22px]" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24 rounded-[22px]" />)}</div>
      <div className="grid gap-4 lg:grid-cols-5"><Skeleton className="h-64 rounded-[22px] lg:col-span-3" /><Skeleton className="h-64 rounded-[22px] lg:col-span-2" /></div>
    </div>
  );
}
