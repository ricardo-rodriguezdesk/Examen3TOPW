import clsx from "clsx";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { useHorario } from "../api/hooks";
import HorarioGrid, { aHora, colorMateria, diaDeHoy, NOMBRE_DIA } from "../components/HorarioGrid";
import { Card, EncabezadoPagina, ErrorState, Skeleton } from "../components/ui";
import { tituloBonito } from "../lib/desempeno";
import type { DiaSemana } from "../types/api";

export default function Horario() {
  const { data, isPending, error, refetch } = useHorario();
  const [diaMovil, setDiaMovil] = useState<DiaSemana | null>(null);

  if (isPending) {
    return (
      <div>
        <Skeleton className="mb-2 h-9 w-48" />
        <Skeleton className="mb-6 h-5 w-64" />
        <Skeleton className="h-[480px] w-full rounded-2xl" />
      </div>
    );
  }
  if (error) return <ErrorState mensaje={error.message} onReintentar={() => refetch()} />;

  const subtitulo = data.periodo?.descripcion ?? "Sin periodo activo";

  if (!data.bloques.length) {
    return (
      <div>
        <EncabezadoPagina titulo="Horario" subtitulo={subtitulo} />
        <Card className="py-12 text-center text-slate-500">
          <CalendarDays className="mx-auto mb-3 size-10 text-slate-300" />
          No tienes clases registradas en este periodo.
        </Card>
      </div>
    );
  }

  const hoy = diaDeHoy();
  const diaSeleccionado = diaMovil ?? (hoy && data.dias.includes(hoy) ? hoy : data.dias[0]);
  const totalHoras = data.materias.reduce((s, m) => s + m.horasSemana, 0);

  return (
    <div>
      <EncabezadoPagina titulo="Horario" subtitulo={subtitulo}>
        <div className="flex gap-2 text-sm">
          <span className="rounded-full bg-superficie px-3 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">{data.materias.length} materias</span>
          <span className="rounded-full bg-superficie px-3 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">{totalHoras} h/semana</span>
        </div>
      </EncabezadoPagina>

      {/* Escritorio: cuadrícula completa */}
      <HorarioGrid bloques={data.bloques} dias={data.dias} horaInicio={data.horaInicio} horaFin={data.horaFin} className="hidden md:block" />

      {/* Móvil: un día a la vez */}
      <div className="md:hidden">
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {data.dias.map((d) => (
            <button
              key={d} onClick={() => setDiaMovil(d)}
              className={clsx("flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold", d === diaSeleccionado ? "bg-superficie text-marca-700 shadow-sm" : "text-slate-500")}
            >
              {NOMBRE_DIA[d].slice(0, 3)}{d === hoy && " •"}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {data.bloques.filter((b) => b.dia === diaSeleccionado).map((b) => {
            const c = colorMateria(b.colorIndice);
            return (
              <div key={`${b.clave}-${b.inicioMin}`} className={clsx("flex gap-3 rounded-xl border-l-4 p-3", c.fondo, c.borde)}>
                <div className="w-14 shrink-0 text-sm font-bold tabular-nums text-slate-700">
                  {aHora(b.inicioMin)}<br /><span className="font-medium text-slate-400">{aHora(b.finMin)}</span>
                </div>
                <div className="min-w-0">
                  <p className={clsx("font-bold leading-tight", c.texto)}>{tituloBonito(b.nombre)}</p>
                  <p className="mt-1 text-xs text-slate-500">{b.clave} · Grupo {b.grupo}{b.salon && ` · ${b.salon}`}</p>
                </div>
              </div>
            );
          })}
          {!data.bloques.some((b) => b.dia === diaSeleccionado) && (
            <p className="py-8 text-center text-slate-400">Sin clases este día 🎉</p>
          )}
        </div>
      </div>

      {/* Lista de materias */}
      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">Materias del periodo</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.materias.map((m) => {
          const c = colorMateria(m.colorIndice);
          const salones = [...new Set(data.bloques.filter((b) => b.idGrupo === m.idGrupo && b.salon).map((b) => b.salon))];
          const dias = data.bloques.filter((b) => b.idGrupo === m.idGrupo).map((b) => NOMBRE_DIA[b.dia].slice(0, 3));
          return (
            <Card key={m.idGrupo} className="p-4">
              <div className="flex items-start gap-3">
                <span className={clsx("mt-1.5 size-2.5 shrink-0 rounded-full", c.punto)} />
                <div className="min-w-0">
                  <p className="font-bold leading-tight text-slate-900">{tituloBonito(m.nombre)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{m.clave} · Grupo {m.grupo}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="size-3.5" /> {m.horasSemana} h · {dias.join(", ")}</span>
                    {salones.length > 0 && <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {salones.join(", ")}</span>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
