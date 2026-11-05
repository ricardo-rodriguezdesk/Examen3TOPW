// Administración · Materias de la retícula (Persona B).
// Tabla filtrable por especialidad, semestre y texto; formulario para crear/editar con su seriación (pre y co-requisitos).

import clsx from "clsx";
import { Link2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { type FormEvent, useDeferredValue, useMemo, useState } from "react";
import { useEliminarMateria, useGuardarMateria, useMateriasAdmin, usePlanesAdmin } from "../../api/admin";
import { Badge, Card, EncabezadoPagina, ErrorState, Skeleton } from "../../components/ui";
import { tituloBonito } from "../../lib/desempeno";
import { coincide, normalizarTexto } from "../../lib/formato";
import type { MateriaAdmin, MateriaAdminEntrada, PlanAdmin, TipoMateria } from "../../types/api";
import { Boton, BotonIcono, Campo, claseInput, Confirmar, MensajeError, Modal } from "./componentes";

const TIPOS: { valor: TipoMateria; texto: string }[] = [
  { valor: "basica", texto: "Básica" },
  { valor: "especialidad", texto: "Especialidad" },
  { valor: "residencia", texto: "Residencia" },
  { valor: "servicio", texto: "Servicio social" },
  { valor: "complementaria", texto: "Complementaria" },
];
const textoTipo = (t: TipoMateria) => TIPOS.find((x) => x.valor === t)?.texto ?? t;

type FiltroEsp = "todas" | "comun" | number;

export default function AdminMaterias() {
  const planes = usePlanesAdmin();
  const [esp, setEsp] = useState<FiltroEsp>("todas");
  const [semestre, setSemestre] = useState<number | "todos">("todos");
  const [texto, setTexto] = useState("");
  const busqueda = normalizarTexto(useDeferredValue(texto).trim());

  const materias = useMateriasAdmin(esp === "todas" ? {} : { especialidadId: esp });
  const todas = useMateriasAdmin({}); // para el selector de requisitos

  const [editando, setEditando] = useState<MateriaAdmin | "nueva" | null>(null);
  const [borrando, setBorrando] = useState<MateriaAdmin | null>(null);
  const eliminar = useEliminarMateria();

  const nombreEsp = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of planes.data ?? []) for (const e of p.especialidades) m.set(e.id, e.nombre);
    return m;
  }, [planes.data]);

  const filtradas = useMemo(
    () => (materias.data ?? []).filter((m) =>
      (semestre === "todos" || m.semestre === semestre) && coincide(busqueda, m.clave, m.nombre)),
    [materias.data, semestre, busqueda],
  );

  const semestres = [...new Set((materias.data ?? []).map((m) => m.semestre))].sort((a, b) => a - b);

  return (
    <div>
      <EncabezadoPagina titulo="Materias de la retícula" subtitulo="Lo que capturas aquí define el mapa, los estados y la seriación que ve el alumno">
        <Boton onClick={() => setEditando("nueva")} disabled={!planes.data?.length}><Plus className="size-4" /> Nueva materia</Boton>
      </EncabezadoPagina>

      <Card className="mb-4 flex flex-col gap-3 p-3! md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por clave o nombre…" className={`${claseInput} bg-slate-50 pl-9`} />
        </label>
        <select aria-label="Especialidad" value={String(esp)} onChange={(e) => setEsp(e.target.value === "todas" || e.target.value === "comun" ? e.target.value : Number(e.target.value))} className={`${claseInput} bg-slate-50 md:w-72`}>
          <option value="todas">Todas las materias</option>
          <option value="comun">Solo tronco común</option>
          {planes.data?.flatMap((p) => p.especialidades.map((e) => <option key={e.id} value={e.id}>Tronco común + {e.nombre}</option>))}
        </select>
        <select aria-label="Semestre" value={String(semestre)} onChange={(e) => setSemestre(e.target.value === "todos" ? "todos" : Number(e.target.value))} className={`${claseInput} bg-slate-50 md:w-40`}>
          <option value="todos">Todos los semestres</option>
          {semestres.map((s) => <option key={s} value={s}>Semestre {s}</option>)}
        </select>
      </Card>

      {materias.isPending ? (
        <Card className="flex flex-col gap-3">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-11" />)}</Card>
      ) : materias.error ? (
        <ErrorState mensaje={materias.error.message} onReintentar={() => materias.refetch()} />
      ) : (
        <Card className="overflow-hidden p-0!">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
            <span><b className="text-slate-800">{filtradas.length}</b> materias · {filtradas.reduce((s, m) => s + m.creditos, 0)} créditos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Clave</th>
                  <th className="px-3 py-3">Materia</th>
                  <th className="px-3 py-3 text-center">Sem.</th>
                  <th className="px-3 py-3 text-center" title="Horas teoría - horas práctica - créditos">HT-HP-Cr</th>
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3">Seriación</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-mono text-xs whitespace-nowrap text-slate-500">{m.clave}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-800">{tituloBonito(m.nombre)}</p>
                      {m.especialidadId !== null && <p className="text-xs text-marca-600">{nombreEsp.get(m.especialidadId) ?? "Especialidad"}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{m.semestre}</td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap text-slate-600 tabular-nums">{m.horasTeoria}-{m.horasPractica}-<b className="text-slate-800">{m.creditos}</b></td>
                    <td className="px-3 py-2.5">
                      <Badge tono={m.tipo === "basica" ? "neutro" : "marca"}>{textoTipo(m.tipo)}</Badge>
                      {m.porcentajeRequerido !== null && <Badge className="mt-1 ml-1" tono="medio">{m.porcentajeRequerido} %</Badge>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex max-w-64 flex-wrap gap-1">
                        {m.requisitos.length === 0 && <span className="text-xs text-slate-300">—</span>}
                        {m.requisitos.map((r) => (
                          <span key={r.id} title={`${r.tipo === "co" ? "Co-requisito" : "Pre-requisito"}: ${tituloBonito(r.nombre)}`}
                            className={clsx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px]",
                              r.tipo === "co" ? "border border-dashed border-violet-300 bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600")}>
                            {r.tipo === "co" && <Link2 className="size-3" />}{r.clave}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">
                      <BotonIcono titulo={`Editar ${m.clave}`} onClick={() => setEditando(m)}><Pencil className="size-4" /></BotonIcono>
                      <BotonIcono titulo={`Eliminar ${m.clave}`} peligro onClick={() => { eliminar.reset(); setBorrando(m); }}><Trash2 className="size-4" /></BotonIcono>
                    </td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No hay materias con esos filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editando && planes.data && (
        <FormularioMateria
          key={editando === "nueva" ? "nueva" : editando.id}
          materia={editando === "nueva" ? null : editando}
          planes={planes.data}
          todas={todas.data ?? []}
          especialidadInicial={typeof esp === "number" ? esp : null}
          onCerrar={() => setEditando(null)}
        />
      )}

      <Confirmar
        abierto={borrando !== null}
        titulo="Eliminar materia"
        mensaje={<>¿Eliminar <b>{borrando && tituloBonito(borrando.nombre)}</b> ({borrando?.clave})? También se quitará como requisito de otras materias y se borrarán sus grupos ofertados.</>}
        onCancelar={() => setBorrando(null)}
        onConfirmar={() => borrando && eliminar.mutate(borrando.id, { onSuccess: () => setBorrando(null) })}
        cargando={eliminar.isPending}
        error={eliminar.error?.message}
      />
    </div>
  );
}

// ---------------- Formulario ----------------

function FormularioMateria({ materia, planes, todas, especialidadInicial, onCerrar }: {
  materia: MateriaAdmin | null; planes: PlanAdmin[]; todas: MateriaAdmin[]; especialidadInicial: number | null; onCerrar: () => void;
}) {
  const guardar = useGuardarMateria();
  const [f, setF] = useState<MateriaAdminEntrada>(() => materia
    ? { ...materia, requisitos: materia.requisitos.map((r) => ({ id: r.id, tipo: r.tipo })) }
    : {
      planId: planes[0].id, especialidadId: especialidadInicial, clave: "", nombre: "",
      horasTeoria: 2, horasPractica: 3, creditos: 5, semestre: 1, tipo: "basica", porcentajeRequerido: null, requisitos: [],
    });
  const [creditosManual, setCreditosManual] = useState(materia !== null);
  const [buscaReq, setBuscaReq] = useState("");

  const set = <K extends keyof MateriaAdminEntrada>(k: K, v: MateriaAdminEntrada[K]) => setF((x) => ({ ...x, [k]: v }));
  const setHoras = (k: "horasTeoria" | "horasPractica", v: number) => setF((x) => {
    const n = { ...x, [k]: v };
    return creditosManual ? n : { ...n, creditos: n.horasTeoria + n.horasPractica }; // en TecNM: créditos = HT + HP
  });

  const plan = planes.find((p) => p.id === f.planId) ?? planes[0];
  const porId = useMemo(() => new Map(todas.map((m) => [m.id, m])), [todas]);
  const candidatas = todas
    .filter((m) => m.planId === f.planId && m.id !== materia?.id && !f.requisitos.some((r) => r.id === m.id))
    .filter((m) => coincide(normalizarTexto(buscaReq.trim()), m.clave, m.nombre))
    .sort((a, b) => a.semestre - b.semestre || a.clave.localeCompare(b.clave));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    guardar.mutate({ id: materia?.id, datos: { ...f, clave: f.clave.trim().toUpperCase(), nombre: f.nombre.trim() } }, { onSuccess: onCerrar });
  };

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <Modal titulo={materia ? `Editar ${materia.clave}` : "Nueva materia"} abierto onCerrar={onCerrar} ancho="max-w-3xl">
      <form onSubmit={enviar} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
          <Campo etiqueta="Clave" className="col-span-2 sm:col-span-2" ayuda="Igual que en el kardex, ej. AED-1026">
            {(id) => <input id={id} required value={f.clave} onChange={(e) => set("clave", e.target.value)} className={`${claseInput} font-mono uppercase`} placeholder="AED-1026" />}
          </Campo>
          <Campo etiqueta="Nombre" className="col-span-2 sm:col-span-4">
            {(id) => <input id={id} required value={f.nombre} onChange={(e) => set("nombre", e.target.value)} className={claseInput} placeholder="Estructura de Datos" />}
          </Campo>

          <Campo etiqueta="Plan" className="col-span-2 sm:col-span-3">
            {(id) => (
              <select id={id} value={f.planId} onChange={(e) => setF((x) => ({ ...x, planId: Number(e.target.value), especialidadId: null, requisitos: [] }))} className={claseInput}>
                {planes.map((p) => <option key={p.id} value={p.id}>{p.clave} · {p.nombre}</option>)}
              </select>
            )}
          </Campo>
          <Campo etiqueta="Pertenece a" className="col-span-2 sm:col-span-3">
            {(id) => (
              <select id={id} value={f.especialidadId ?? ""} onChange={(e) => set("especialidadId", e.target.value ? Number(e.target.value) : null)} className={claseInput}>
                <option value="">Tronco común</option>
                {plan.especialidades.map((e) => <option key={e.id} value={e.id}>Especialidad: {e.nombre}</option>)}
              </select>
            )}
          </Campo>

          <Campo etiqueta="Semestre">
            {(id) => <input id={id} type="number" min={1} max={12} required value={f.semestre} onChange={(e) => set("semestre", num(e.target.value))} className={claseInput} />}
          </Campo>
          <Campo etiqueta="Horas T">
            {(id) => <input id={id} type="number" min={0} max={20} value={f.horasTeoria} onChange={(e) => setHoras("horasTeoria", num(e.target.value))} className={claseInput} />}
          </Campo>
          <Campo etiqueta="Horas P">
            {(id) => <input id={id} type="number" min={0} max={20} value={f.horasPractica} onChange={(e) => setHoras("horasPractica", num(e.target.value))} className={claseInput} />}
          </Campo>
          <Campo etiqueta="Créditos" ayuda={creditosManual ? undefined : "HT + HP"}>
            {(id) => <input id={id} type="number" min={0} max={20} value={f.creditos} onChange={(e) => { setCreditosManual(true); set("creditos", num(e.target.value)); }} className={claseInput} />}
          </Campo>
          <Campo etiqueta="Tipo" className="col-span-2 sm:col-span-2">
            {(id) => (
              <select id={id} value={f.tipo} onChange={(e) => set("tipo", e.target.value as TipoMateria)} className={claseInput}>
                {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
              </select>
            )}
          </Campo>
          <Campo etiqueta="% de créditos requerido" className="col-span-2 sm:col-span-2" ayuda="Vacío si no aplica (ej. Residencia = 80)">
            {(id) => <input id={id} type="number" min={0} max={100} value={f.porcentajeRequerido ?? ""} onChange={(e) => set("porcentajeRequerido", e.target.value === "" ? null : Number(e.target.value))} className={claseInput} placeholder="—" />}
          </Campo>
        </div>

        {/* Seriación */}
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Seriación</p>
          <p className="mb-2 text-xs text-slate-400">
            <b>Pre-requisito:</b> debe acreditarse antes. <b>Co-requisito:</b> se cursa en el mismo semestre. Haz clic en el tipo para cambiarlo.
          </p>
          <div className="mb-2 flex min-h-11 flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2">
            {f.requisitos.length === 0 && <span className="px-1 py-1 text-sm text-slate-400">Sin requisitos</span>}
            {f.requisitos.map((r) => {
              const m = porId.get(r.id);
              return (
                <span key={r.id} className={clsx("inline-flex items-center gap-1 rounded-lg border bg-white py-1 pr-1 pl-2 text-xs", r.tipo === "co" ? "border-dashed border-violet-300" : "border-slate-200")}>
                  <span className="font-mono font-semibold text-slate-700">{m?.clave}</span>
                  <span className="hidden max-w-40 truncate text-slate-500 sm:inline">{m && tituloBonito(m.nombre)}</span>
                  <button type="button" onClick={() => set("requisitos", f.requisitos.map((x) => x.id === r.id ? { ...x, tipo: x.tipo === "pre" ? "co" : "pre" } : x))}
                    className={clsx("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", r.tipo === "co" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600")}
                    title="Cambiar entre pre y co-requisito">
                    {r.tipo}
                  </button>
                  <button type="button" onClick={() => set("requisitos", f.requisitos.filter((x) => x.id !== r.id))} className="rounded p-0.5 text-slate-400 hover:bg-bajo-suave hover:text-bajo" aria-label={`Quitar ${m?.clave}`}>
                    <X className="size-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
          <div className="rounded-xl border border-slate-200">
            <div className="relative border-b border-slate-100">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input value={buscaReq} onChange={(e) => setBuscaReq(e.target.value)} placeholder="Agregar requisito: busca por clave o nombre…" className="w-full rounded-t-xl py-2 pr-3 pl-9 text-sm outline-none" />
            </div>
            <ul className="max-h-44 overflow-y-auto">
              {candidatas.slice(0, 60).map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => { set("requisitos", [...f.requisitos, { id: m.id, tipo: m.semestre === f.semestre ? "co" : "pre" }]); setBuscaReq(""); }}
                    className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm hover:bg-marca-50">
                    <span className="w-8 shrink-0 text-xs text-slate-400">S{m.semestre}</span>
                    <span className="w-20 shrink-0 font-mono text-xs text-slate-500">{m.clave}</span>
                    <span className="truncate text-slate-700">{tituloBonito(m.nombre)}</span>
                    <Plus className="ml-auto size-4 shrink-0 text-marca-500" />
                  </button>
                </li>
              ))}
              {candidatas.length === 0 && <li className="px-3 py-3 text-sm text-slate-400">Sin resultados.</li>}
            </ul>
          </div>
        </div>

        {guardar.error && <MensajeError>{guardar.error.message}</MensajeError>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={guardar.isPending}>{materia ? "Guardar cambios" : "Crear materia"}</Boton>
        </div>
      </form>
    </Modal>
  );
}
