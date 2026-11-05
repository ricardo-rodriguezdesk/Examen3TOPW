// Planificador · Generador de horarios (Persona B) — CONTEXTO.md §7 y §10 (B3).
// El alumno elige materias inscribibles y preferencias; el sistema propone combinaciones de grupos sin choques.
// Cada opción se dibuja con <HorarioGrid> (componente de A).

import clsx from "clsx";
import { BookmarkCheck, CalendarSearch, Check, CircleCheck, Clock, Coffee, Gauge, Layers, Link2, Lock, Pencil, Sparkles, Trash2, TriangleAlert, User } from "lucide-react";
import { useMemo, useState } from "react";
import { useAvance, useBorrarMiHorario, useGenerarHorarios, useGuardarMiHorario, useMiHorario, useOferta } from "../../api/planificador";
import HorarioGrid, { aBloqueGrid, colorMateria, DIAS_ORDEN } from "../../components/HorarioGrid";
import { Badge, Card, EncabezadoPagina, ErrorState, Skeleton } from "../../components/ui";
import { tituloBonito } from "../../lib/desempeno";
import type { DiaSemana } from "../../types/api";
import { useEspecialidad } from "../../lib/planificador";
import type { GrupoOferta, MiHorario, OpcionesHorario, OpcionHorario, Preferencias as PreferenciasHorario } from "../../types/api";

type Turno = "cualquiera" | "matutino" | "vespertino";

export default function Generador() {
  const { especialidad } = useEspecialidad();
  const avance = useAvance(especialidad);
  const oferta = useOferta(especialidad);
  const generar = useGenerarHorarios(especialidad);
  const miHorario = useMiHorario();
  const guardar = useGuardarMiHorario();

  const [elegidas, setElegidas] = useState<string[]>([]);
  const [turno, setTurno] = useState<Turno>("cualquiera");
  const [evitarSabado, setEvitarSabado] = useState(true);
  const [maxCreditos, setMaxCreditos] = useState(36);
  const [opcionActiva, setOpcionActiva] = useState(0);

  const gruposPorClave = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of oferta.data?.grupos ?? []) m.set(g.clave, (m.get(g.clave) ?? 0) + 1);
    return m;
  }, [oferta.data]);

  if (avance.isPending || oferta.isPending) return <SkeletonGenerador />;
  if (avance.error) return <ErrorState mensaje={avance.error.message} onReintentar={() => avance.refetch()} />;
  if (oferta.error) return <ErrorState mensaje={oferta.error.message} onReintentar={() => oferta.refetch()} />;

  const inscribibles = avance.data.materias
    // misma regla que el backend: disponibles, o reprobadas sin seriación ni % pendiente
    .filter((m) => m.estado === "disponible" || (m.estado === "reprobada" && !m.requisitosPendientes.length && !m.faltaPorcentaje))
    .sort((a, b) => Number(gruposPorClave.has(b.clave)) - Number(gruposPorClave.has(a.clave)) || a.semestreSugerido - b.semestreSugerido);
  const creditosDe = (c: string) => avance.data.materias.find((m) => m.clave === c)?.creditos ?? 0;
  const creditosElegidos = elegidas.reduce((s, c) => s + creditosDe(c), 0);
  const excede = creditosElegidos > maxCreditos;

  const estadoDe = (c: string) => avance.data.materias.find((m) => m.clave === c)?.estado;
  const pareja = (cos: string[]) => cos.filter((c) => estadoDe(c) !== "aprobada" && estadoDe(c) !== "cursando");
  const nombreDe = (c: string) => tituloBonito(avance.data.materias.find((m) => m.clave === c)?.nombre ?? c);
  const marcables = new Set(inscribibles.filter((m) => gruposPorClave.has(m.clave)).map((m) => m.clave));
  /** Al marcar una materia también se marcan sus co-requisitos inscribibles: se cursan juntas. */
  const alternar = (c: string) => setElegidas((xs) => {
    if (xs.includes(c)) return xs.filter((x) => x !== c);
    const pareja = (avance.data.materias.find((m) => m.clave === c)?.correquisitos ?? []).filter((co) => marcables.has(co) && !xs.includes(co));
    return [...xs, c, ...pareja];
  });
  const onGenerar = (claves = elegidas, t: Turno = turno) => {
    const preferencias: PreferenciasHorario = { evitarSabado, maxCreditos, ...(t !== "cualquiera" && { turno: t }) };
    setOpcionActiva(0);
    generar.mutate({ claves, preferencias });
  };
  const quitarYGenerar = (c: string) => { const n = elegidas.filter((x) => x !== c); setElegidas(n); onGenerar(n); };
  const cualquierTurno = () => { setTurno("cualquiera"); onGenerar(elegidas, "cualquiera"); };

  return (
    <div>
      <EncabezadoPagina titulo="Generador de horarios" subtitulo={`Oferta de ${oferta.data.periodoTexto}: elige tus materias y te proponemos horarios sin choques`} />

      {miHorario.data?.guardado && (
        <MiHorarioGuardado
          mio={miHorario.data}
          onCambiar={() => {
            // Vuelve a cargar las materias guardadas para armar otra opción (al guardar, se reemplaza)
            const claves = miHorario.data!.guardado!.grupos.map((g) => g.clave).filter((c) => gruposPorClave.has(c));
            setElegidas(claves);
            document.getElementById("armar-horario")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}

      {oferta.data.grupos.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <CalendarSearch className="size-10 text-slate-300" />
          <p className="max-w-md text-slate-500">
            No tienes materias por inscribir en la oferta de {oferta.data.periodoTexto}. Si estás por egresar, revisa en <b>Avance</b> lo que te falta (servicio social, residencia, complementarias).
          </p>
        </Card>
      ) : (

      <div id="armar-horario" className="grid scroll-mt-6 items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* ---------- Configuración ---------- */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-6">
          <Card className="p-0!">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h2 className="font-bold text-slate-900">1. Materias</h2>
              <span className={clsx("text-sm font-semibold tabular-nums", excede ? "text-bajo" : "text-slate-500")}>
                {creditosElegidos} / {maxCreditos} cr
              </span>
            </div>
            <ul className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
              {inscribibles.map((m) => {
                const grupos = gruposPorClave.get(m.clave) ?? 0;
                const activa = elegidas.includes(m.clave);
                return (
                  <li key={m.clave}>
                    <label className={clsx("flex items-center gap-3 px-5 py-2.5", grupos ? "cursor-pointer hover:bg-slate-50" : "cursor-not-allowed opacity-50")}>
                      <input type="checkbox" className="peer sr-only" checked={activa} disabled={!grupos} onChange={() => alternar(m.clave)} />
                      <span className={clsx(
                        "grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] transition peer-focus-visible:ring-2 peer-focus-visible:ring-marca-200",
                        activa ? "border-marca-500 bg-marca-500 text-white" : "border-slate-300",
                      )}>
                        {activa && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">{tituloBonito(m.nombre)}</span>
                        <span className="block text-xs text-slate-400">
                          {m.clave} · {m.creditos} cr · {grupos ? `${grupos} grupo${grupos > 1 ? "s" : ""}` : "sin grupos este periodo"}
                        </span>
                        {pareja(m.correquisitos).length > 0 && (
                          <span className="mt-0.5 flex items-center gap-1 text-[12px] text-marca-500">
                            <Link2 className="size-3" /> Junto con {pareja(m.correquisitos).map(nombreDe).join(", ")}
                          </span>
                        )}
                      </span>
                      {m.estado === "reprobada" && <Badge tono="bajo">Repetición</Badge>}
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="font-bold text-slate-900">2. Preferencias</h2>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500">Turno</p>
              <div className="segmentado grid w-full grid-cols-3">
                {(["cualquiera", "matutino", "vespertino"] as Turno[]).map((t) => (
                  <button key={t} onClick={() => setTurno(t)} aria-pressed={turno === t}
                    className="segmento capitalize">
                    {t}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Matutino: termina antes de las 14:00 · Vespertino: empieza desde las 13:00</p>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-700">Evitar clases en sábado</span>
              <input type="checkbox" className="peer sr-only" checked={evitarSabado} onChange={(e) => setEvitarSabado(e.target.checked)} />
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-relleno transition peer-checked:bg-[#34c759] peer-focus-visible:ring-2 peer-focus-visible:ring-marca-200 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-superficie after:shadow after:transition peer-checked:after:translate-x-5" />
            </label>

            <label className="block">
              <span className="mb-1 flex items-center justify-between text-sm font-semibold text-slate-700">
                Máximo de créditos <span className="tabular-nums text-marca-700">{maxCreditos}</span>
              </span>
              <input type="range" min={12} max={40} value={maxCreditos} onChange={(e) => setMaxCreditos(Number(e.target.value))} className="w-full accent-marca-600" />
            </label>

            {excede && <p className="text-xs font-semibold text-bajo">Tus materias suman {creditosElegidos} créditos: quita alguna o sube el máximo.</p>}

            <button
              onClick={() => onGenerar()} disabled={elegidas.length === 0 || excede || generar.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-marca-700 px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-marca-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Sparkles className="size-4" /> {generar.isPending ? "Generando…" : "Generar horarios"}
            </button>
          </Card>
        </div>

        {/* ---------- Resultados ---------- */}
        <div className="min-w-0">
          {generar.isPending ? (
            <div className="flex flex-col gap-3"><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-[520px] w-full rounded-[22px]" /></div>
          ) : generar.error ? (
            <ErrorState mensaje={generar.error.message} onReintentar={() => onGenerar()} />
          ) : !generar.data ? (
            <Card className="flex flex-col items-center gap-3 py-16 text-center">
              <CalendarSearch className="size-10 text-slate-300" />
              <p className="max-w-sm text-slate-500">Marca las materias que quieres llevar, ajusta tus preferencias y presiona <b>Generar horarios</b>.</p>
            </Card>
          ) : (
            <Resultados
              opciones={generar.data.opciones}
              advertencias={generar.data.advertencias}
              sugerencias={generar.data.sugerencias ?? []}
              opcionesSinTurno={generar.data.opcionesSinTurno ?? 0}
              onQuitar={quitarYGenerar}
              onCualquierTurno={cualquierTurno}
              guardadoIds={new Set(miHorario.data?.guardado?.grupos.map((g) => g.id) ?? [])}
              periodoTexto={miHorario.data?.periodoTexto ?? oferta.data.periodoTexto}
              onGuardar={(op) => guardar.mutate(op.grupos.map((g) => g.id))}
              guardando={guardar.isPending}
              errorGuardar={guardar.error?.message ?? null}
              onCambiarOpcion={() => guardar.reset()}
              activa={Math.min(opcionActiva, Math.max(0, generar.data.opciones.length - 1))}
              onActiva={setOpcionActiva}
              orden={elegidas}
            />
          )}
        </div>
      </div>
      )}
    </div>
  );
}

// ---------------- Resultados ----------------

function Resultados({ opciones, advertencias, sugerencias, opcionesSinTurno, onQuitar, onCualquierTurno, activa, onActiva, orden,
  guardadoIds, periodoTexto, onGuardar, guardando, errorGuardar, onCambiarOpcion }: {
  guardadoIds: Set<number>; periodoTexto: string; onGuardar: (op: OpcionHorario) => void; guardando: boolean;
  errorGuardar: string | null; onCambiarOpcion: () => void;
  opciones: OpcionHorario[]; advertencias: string[]; activa: number; onActiva: (i: number) => void; orden: string[];
  sugerencias: NonNullable<OpcionesHorario["sugerencias"]>; opcionesSinTurno: number;
  onQuitar: (clave: string) => void; onCualquierTurno: () => void;
}) {
  // El backend ya explica cada problema: materias sin grupo, co-requisitos faltantes, carga excesiva…
  const aviso = advertencias.length > 0 && (
    <div className="mb-4 flex gap-3 rounded-[16px] bg-medio-suave p-3 text-[14px] text-medio">
      <TriangleAlert className="mt-0.5 size-5 shrink-0" />
      <ul className="flex flex-col gap-1">
        {advertencias.map((a) => <li key={a} className="text-slate-700">{a}</li>)}
      </ul>
    </div>
  );

  if (opciones.length === 0) {
    const plural = (n: number) => `${n === 10 ? "10+" : n} ${n === 1 ? "opción" : "opciones"}`;
    return (
      <div>
        {aviso}
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-[17px] font-semibold text-slate-900">No caben todas juntas</h2>
            <p className="mt-0.5 text-[15px] text-slate-500">Prueba alguna de estas opciones:</p>
          </div>
          {(sugerencias.length > 0 || opcionesSinTurno > 0) ? (
            <div className="flex flex-col gap-2">
              {opcionesSinTurno > 0 && (
                <button onClick={onCualquierTurno} className="flex items-center justify-between gap-3 rounded-[14px] bg-relleno px-4 py-3 text-left transition hover:bg-slate-100">
                  <span className="text-[15px] text-slate-900">Usar <b>cualquier turno</b></span>
                  <span className="text-[13px] font-semibold text-marca-500">{plural(opcionesSinTurno)}</span>
                </button>
              )}
              {sugerencias.map((s) => (
                <button key={s.quitar} onClick={() => onQuitar(s.quitar)} className="flex items-center justify-between gap-3 rounded-[14px] bg-relleno px-4 py-3 text-left transition hover:bg-slate-100">
                  <span className="text-[15px] text-slate-900">Quitar <b>{tituloBonito(s.nombre)}</b></span>
                  <span className="text-[13px] font-semibold text-marca-500">{plural(s.opciones)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[15px] text-slate-500">Quitar una sola materia no alcanza. Prueba con menos materias o con otras preferencias.</p>
          )}
        </Card>
      </div>
    );
  }

  const o = opciones[activa];
  const color = (clave: string) => Math.max(0, orden.indexOf(clave));
  const bloques = o.grupos.flatMap((g) => g.bloques.map((b) => aBloqueGrid({ ...b, clave: g.clave, nombre: g.nombre, grupo: g.grupo }, color(g.clave))));
  const usados = new Set<DiaSemana>(bloques.map((b) => b.dia));
  const dias = DIAS_ORDEN.filter((d) => d !== "sabado" || usados.has(d));
  const horaInicio = Math.floor(Math.min(...bloques.map((b) => b.inicioMin)) / 60);
  const horaFin = Math.ceil(Math.max(...bloques.map((b) => b.finMin)) / 60);

  return (
    <div>
      {aviso}

      {/* Pestañas de opciones */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {opciones.map((op, i) => (
          <button key={i} onClick={() => { onActiva(i); onCambiarOpcion(); }} aria-pressed={i === activa}
            className={clsx(
              "flex shrink-0 flex-col items-start rounded-[16px] px-4 py-2 text-left transition",
              i === activa ? "bg-marca-500 [&_span]:text-white" : "bg-superficie hover:bg-slate-50",
            )}>
            <span className={clsx("text-sm font-bold", i === activa ? "text-marca-700" : "text-slate-700")}>
              Opción {i + 1}{i === 0 && <span className="ml-1.5 rounded bg-alto px-1 py-0.5 text-[10px] text-white">MEJOR</span>}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">{op.horaEntrada}–{op.horaSalida} · {op.diasConClase} días · {op.puntuacion} pts</span>
          </button>
        ))}
      </div>

      {/* Guardar: cuenta en la demanda que ve la coordinación */}
      <BarraGuardar
        guardada={o.grupos.length === guardadoIds.size && o.grupos.every((g) => guardadoIds.has(g.id))}
        hayOtroGuardado={guardadoIds.size > 0}
        periodoTexto={periodoTexto} guardando={guardando} error={errorGuardar}
        onGuardar={() => onGuardar(o)}
      />

      {/* Métricas */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica icono={Layers} etiqueta="Créditos" valor={String(o.creditos)} />
        <Metrica icono={Clock} etiqueta="Entrada – salida" valor={`${o.horaEntrada}–${o.horaSalida}`} />
        <Metrica icono={Coffee} etiqueta="Horas libres entre clases" valor={`${o.horasHueco} h/sem`} />
        <Metrica icono={Gauge} etiqueta="Puntuación" valor={`${o.puntuacion}/100`} />
      </div>

      <HorarioGrid bloques={bloques} dias={dias} horaInicio={horaInicio} horaFin={horaFin} marcarHoy={false} />

      {/* Grupos */}
      <Card className="mt-4 p-0!">
        <ul className="divide-y divide-slate-100">
          {o.grupos.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
              <span className={clsx("size-3 shrink-0 rounded-full", colorMateria(color(g.clave)).punto)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{tituloBonito(g.nombre)} <span className="font-normal text-slate-400">· Grupo {g.grupo}</span></p>
                <p className="flex items-center gap-1 text-xs text-slate-500"><User className="size-3" /> {g.docente ?? "Por asignar"}</p>
              </div>
              <span className="text-xs text-slate-400">{g.bloques[0]?.salon ?? "—"} · cupo {g.cupo}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ---------------- Guardar mi horario ----------------

const PRIVACIDAD = "Se guarda de forma anónima: la coordinación solo ve cuántos alumnos planean cada grupo.";

function BarraGuardar({ guardada, hayOtroGuardado, periodoTexto, guardando, error, onGuardar }: {
  guardada: boolean; hayOtroGuardado: boolean; periodoTexto: string; guardando: boolean; error: string | null; onGuardar: () => void;
}) {
  return (
    <div className="mb-4 rounded-[18px] bg-superficie p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex flex-1 items-start gap-2 text-[13px] text-slate-500">
          <Lock className="mt-0.5 size-3.5 shrink-0" /> {PRIVACIDAD}
        </p>
        {guardada ? (
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-alto-suave px-4 py-2 text-[15px] font-semibold text-alto">
            <CircleCheck className="size-4" /> Guardado para {periodoTexto}
          </span>
        ) : (
          <button
            onClick={onGuardar} disabled={guardando}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-marca-700 px-5 py-2.5 text-[15px] font-semibold text-white transition hover:bg-marca-800 active:scale-[0.98] disabled:opacity-60"
          >
            <BookmarkCheck className="size-4" /> {guardando ? "Guardando…" : hayOtroGuardado ? "Guardar este (reemplaza el anterior)" : "Guardar este horario"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-[12px] bg-bajo-suave px-3 py-2 text-[14px] text-bajo">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function MiHorarioGuardado({ mio, onCambiar }: { mio: MiHorario; onCambiar: () => void }) {
  const borrar = useBorrarMiHorario();
  const [confirmar, setConfirmar] = useState(false);
  const g = mio.guardado!;
  const bloques = g.grupos.flatMap((x: GrupoOferta, i) => x.bloques.map((b) => aBloqueGrid({ ...b, clave: x.clave, nombre: x.nombre, grupo: x.grupo }, i)));
  const usados = new Set<DiaSemana>(bloques.map((b) => b.dia));
  const dias = DIAS_ORDEN.filter((d) => d !== "sabado" || usados.has(d));
  const horaInicio = bloques.length ? Math.floor(Math.min(...bloques.map((b) => b.inicioMin)) / 60) : 7;
  const horaFin = bloques.length ? Math.ceil(Math.max(...bloques.map((b) => b.finMin)) / 60) : 14;
  const fecha = new Date(g.actualizado).toLocaleString("es-MX", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

  return (
    <Card className="mb-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[20px] font-bold text-slate-900">
            <BookmarkCheck className="size-5 text-alto" /> Mi horario para {mio.periodoTexto}
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">{g.grupos.length} materias · {g.creditos} créditos · Guardado el {fecha}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCambiar} className="inline-flex items-center gap-1.5 rounded-full bg-relleno px-4 py-2 text-[15px] font-semibold text-marca-500 hover:bg-slate-100">
            <Pencil className="size-4" /> Cambiar
          </button>
          {confirmar ? (
            <button onClick={() => borrar.mutate(undefined, { onSettled: () => setConfirmar(false) })} disabled={borrar.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-bajo px-4 py-2 text-[15px] font-semibold text-white">
              <Trash2 className="size-4" /> {borrar.isPending ? "Quitando…" : "¿Quitar? Sí"}
            </button>
          ) : (
            <button onClick={() => setConfirmar(true)} className="inline-flex items-center gap-1.5 rounded-full bg-relleno px-4 py-2 text-[15px] font-semibold text-bajo hover:bg-slate-100">
              <Trash2 className="size-4" /> Quitar
            </button>
          )}
        </div>
      </div>
      <HorarioGrid bloques={bloques} dias={dias} horaInicio={horaInicio} horaFin={Math.max(horaFin, horaInicio + 1)} marcarHoy={false} />
      <p className="flex items-start gap-2 text-[13px] text-slate-500"><Lock className="mt-0.5 size-3.5 shrink-0" /> {PRIVACIDAD}</p>
      {borrar.error && <p role="alert" className="text-[14px] text-bajo">{borrar.error.message}</p>}
    </Card>
  );
}

function Metrica({ icono: Icono, etiqueta, valor }: { icono: typeof Clock; etiqueta: string; valor: string }) {
  return (
    <Card className="p-3!">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><Icono className="size-3.5" />{etiqueta}</p>
      <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{valor}</p>
    </Card>
  );
}

function SkeletonGenerador() {
  return (
    <div>
      <Skeleton className="mb-2 h-8 w-64" /><Skeleton className="mb-6 h-4 w-96 max-w-full" />
      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4"><Skeleton className="h-80 rounded-[22px]" /><Skeleton className="h-64 rounded-[22px]" /></div>
        <Skeleton className="h-96 rounded-[22px]" />
      </div>
    </div>
  );
}
