import clsx from "clsx";
import {
  AlertTriangle, ArrowRight, Award, BookOpen, CalendarClock, CheckCircle2, Coffee, Layers, MapPin, TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useCalificaciones, useEstudiante, useHorario } from "../api/hooks";
import { aHora, colorMateria, diaDeHoy, DIAS_ORDEN, NOMBRE_DIA } from "../components/HorarioGrid";
import { Calificacion, Card, ErrorState, Skeleton } from "../components/ui";
import { desempenoDe, estiloDesempeno, tituloBonito } from "../lib/desempeno";
import type { Horario } from "../types/api";

export default function Dashboard() {
  const estudiante = useEstudiante();

  if (estudiante.isPending) return <DashboardSkeleton />;
  if (estudiante.error) return <ErrorState mensaje={estudiante.error.message} onReintentar={() => estudiante.refetch()} />;

  const e = estudiante.data;
  const primerNombre = tituloBonito(e.nombre.split(" ")[0] ?? "");
  const desPromedio = desempenoDe(e.promedioPonderado);
  // El SII no da el total de créditos del plan; lo estimamos con créditos y % de avance.
  const creditosPlan = e.porcentajeAvance > 0 ? Math.round((e.creditosAcumulados * 100) / e.porcentajeAvance) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-marca-600">{e.semestre}.º semestre</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Hola, {primerNombre} 👋</h1>
      </div>

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador icono={<Award />} titulo="Promedio ponderado" tono={desPromedio}>
          <span className={clsx("text-3xl font-extrabold tabular-nums", estiloDesempeno[desPromedio].texto)}>{e.promedioPonderado.toFixed(1)}</span>
          <span className="text-sm text-slate-400">Aritmético: {e.promedioAritmetico.toFixed(1)}</span>
        </Indicador>

        <Indicador icono={<Layers />} titulo="Créditos acumulados">
          <span className="text-3xl font-extrabold tabular-nums text-slate-900">{e.creditosAcumulados}</span>
          <span className="text-sm text-slate-400">{creditosPlan ? `de ~${creditosPlan} del plan` : "créditos aprobados"}</span>
        </Indicador>

        <Card className="flex items-center gap-4">
          <Anillo porcentaje={e.porcentajeAvance} secundario={e.porcentajeAvanceCursando} />
          <div>
            <p className="text-sm font-semibold text-slate-500">Avance de la carrera</p>
            <p className="mt-1 text-xs text-slate-400">
              <span className="mr-1 inline-block size-2 rounded-full bg-marca-600" />Aprobado {e.porcentajeAvance}%
            </p>
            <p className="text-xs text-slate-400">
              <span className="mr-1 inline-block size-2 rounded-full bg-sky-300" />Cursando {e.porcentajeAvanceCursando}%
            </p>
          </div>
        </Card>

        <Indicador icono={<BookOpen />} titulo="Materias">
          <span className="text-3xl font-extrabold tabular-nums text-slate-900">
            {e.materiasAprobadas}<span className="text-lg text-slate-300">/{e.materiasCursadas}</span>
          </span>
          <span className="text-sm text-slate-400">aprobadas de cursadas</span>
        </Indicador>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ClasesDeHoy />
        <Situacion
          repeticion={e.materiasEnRepeticion} especial={e.materiasEnEspecial}
          pendientes={e.materiasNoAcreditadasPendientes} complementarios={e.creditosComplementarios}
        />
      </div>

      <PeriodoActual />
    </div>
  );
}

// ---------------- Piezas ----------------

function Indicador({ icono, titulo, tono, children }: { icono: ReactNode; titulo: string; tono?: keyof typeof estiloDesempeno; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
        <span className={clsx("grid size-8 place-items-center rounded-lg [&>svg]:size-4", tono ? clsx(estiloDesempeno[tono].fondo, estiloDesempeno[tono].texto) : "bg-marca-50 text-marca-700")}>{icono}</span>
        {titulo}
      </div>
      <div className="flex flex-col">{children}</div>
    </Card>
  );
}

function Anillo({ porcentaje, secundario }: { porcentaje: number; secundario: number }) {
  const r = 34, c = 2 * Math.PI * r;
  const arco = (p: number) => `${(Math.min(100, Math.max(0, p)) / 100) * c} ${c}`;
  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-slate-100" />
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={arco(secundario)} className="stroke-sky-300" />
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={arco(porcentaje)} className="stroke-marca-600" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-extrabold tabular-nums text-slate-900">{porcentaje}%</span>
    </div>
  );
}

/** Clases de hoy; si hoy no hay, muestra el siguiente día con clases. */
function ClasesDeHoy() {
  const { data, isPending, error } = useHorario();
  const ahora = new Date();
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();

  const elegirDia = (h: Horario) => {
    const hoy = diaDeHoy(ahora);
    const desde = hoy ? DIAS_ORDEN.indexOf(hoy) : -1;
    for (let i = 0; i < 7; i++) {
      const dia = DIAS_ORDEN[(desde + i + 7) % 7] ?? DIAS_ORDEN[0];
      if (!dia) continue;
      // Hoy solo cuenta si aún quedan clases por terminar
      const bloques = h.bloques.filter((b) => b.dia === dia && (i > 0 || b.finMin > minAhora));
      if (bloques.length) return { dia, esHoy: i === 0 && !!hoy, bloques };
    }
    return null;
  };

  return (
    <Card className="lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><CalendarClock className="size-5 text-marca-600" /> Tus clases</h2>
        <Link to="/horario" className="flex items-center gap-1 text-sm font-semibold text-marca-600 hover:text-marca-800">Horario completo <ArrowRight className="size-4" /></Link>
      </div>

      {isPending && <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
      {error && <p className="text-sm text-bajo">{error.message}</p>}
      {data && (() => {
        const sel = elegirDia(data);
        if (!sel) return <p className="py-6 text-center text-slate-400">No hay clases registradas este periodo.</p>;
        return (
          <>
            <p className="mb-3 text-sm text-slate-500">
              {sel.esHoy ? "Hoy" : `Próximo día con clases: ${NOMBRE_DIA[sel.dia]}`}
            </p>
            <ol className="space-y-2">
              {sel.bloques.map((b, i) => {
                const c = colorMateria(b.colorIndice);
                const enCurso = sel.esHoy && b.inicioMin <= minAhora && minAhora < b.finMin;
                const siguiente = sel.esHoy && !enCurso && i === sel.bloques.findIndex((x) => x.inicioMin > minAhora);
                return (
                  <li key={`${b.clave}-${b.inicioMin}`} className={clsx("flex items-center gap-4 rounded-xl border p-3", enCurso ? "border-marca-200 bg-marca-50" : "border-slate-100")}>
                    <div className="w-24 shrink-0 text-sm font-bold tabular-nums text-slate-700">{aHora(b.inicioMin)}–{aHora(b.finMin)}</div>
                    <span className={clsx("h-8 w-1 shrink-0 rounded-full", c.punto)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{tituloBonito(b.nombre)}</p>
                      <p className="text-xs text-slate-400">{b.clave} · Grupo {b.grupo}</p>
                    </div>
                    {b.salon && <span className="hidden items-center gap-1 text-sm text-slate-500 sm:flex"><MapPin className="size-4" />{b.salon}</span>}
                    {enCurso && <span className="rounded-full bg-marca-700 px-2 py-0.5 text-xs font-bold text-white">Ahora</span>}
                    {siguiente && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">Siguiente</span>}
                  </li>
                );
              })}
            </ol>
            {sel.esHoy && sel.bloques.length > 1 && hayHueco(sel.bloques) && (
              <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Coffee className="size-4" /> Tienes horas libres entre clases hoy.</p>
            )}
          </>
        );
      })()}
    </Card>
  );
}

const hayHueco = (bs: { inicioMin: number; finMin: number }[]) => bs.some((b, i) => i > 0 && b.inicioMin > bs[i - 1].finMin);

function Situacion({ repeticion, especial, pendientes, complementarios }: { repeticion: number; especial: number; pendientes: number; complementarios: number }) {
  const alertas: { nivel: "bajo" | "medio"; texto: string }[] = [];
  if (especial > 0) alertas.push({ nivel: "bajo", texto: `${especial} materia(s) en curso especial: si no se acredita, es baja definitiva.` });
  if (repeticion > 0) alertas.push({ nivel: "medio", texto: `${repeticion} materia(s) en curso de repetición.` });
  if (pendientes > 0) alertas.push({ nivel: "medio", texto: `${pendientes} materia(s) no acreditadas por recursar.` });

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><TrendingUp className="size-5 text-marca-600" /> Situación académica</h2>
      {alertas.length === 0 ? (
        <div className="flex gap-3 rounded-xl bg-alto-suave p-3 text-sm text-alto">
          <CheckCircle2 className="size-5 shrink-0" /> Sin materias en riesgo. ¡Vas bien!
        </div>
      ) : (
        <ul className="space-y-2">
          {alertas.map((a) => (
            <li key={a.texto} className={clsx("flex gap-3 rounded-xl p-3 text-sm", estiloDesempeno[a.nivel].fondo, estiloDesempeno[a.nivel].texto)}>
              <AlertTriangle className="size-5 shrink-0" /> {a.texto}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-semibold text-slate-600">Créditos complementarios</span>
          <span className="font-bold tabular-nums text-slate-900">{complementarios}/5</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-marca-600" style={{ width: `${Math.min(100, (complementarios / 5) * 100)}%` }} />
        </div>
      </div>
      <Link to="/planificador" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-marca-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-marca-800">
        Planear mi trayectoria <ArrowRight className="size-4" />
      </Link>
    </Card>
  );
}

function PeriodoActual() {
  const { data, isPending, error } = useCalificaciones();
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-slate-900">Este periodo</h2>
          {data?.periodo && <p className="text-sm text-slate-400">{data.periodo.descripcion} · promedio de unidades capturadas</p>}
        </div>
        <Link to="/calificaciones" className="flex items-center gap-1 text-sm font-semibold text-marca-600 hover:text-marca-800">Ver calificaciones <ArrowRight className="size-4" /></Link>
      </div>
      {isPending && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>}
      {error && <p className="text-sm text-bajo">{error.message}</p>}
      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.materias.map((m) => (
            <div key={m.idGrupo} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
              <Calificacion valor={m.promedioActual} desempeno={m.desempeno} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{tituloBonito(m.nombre)}</p>
                <p className="text-xs text-slate-400">{m.unidadesCapturadas}/{m.unidades.length || "—"} unidades</p>
              </div>
            </div>
          ))}
          {!data.materias.length && <p className="text-sm text-slate-400">Sin materias en el periodo actual.</p>}
        </div>
      )}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div><Skeleton className="mb-2 h-4 w-24" /><Skeleton className="h-9 w-56" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      <div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-72 rounded-2xl lg:col-span-2" /><Skeleton className="h-72 rounded-2xl" /></div>
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
