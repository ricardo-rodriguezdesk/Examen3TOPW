// Administración · Oferta de grupos (Persona B).
// Grupos por periodo con su horario. Es lo que usa el Generador de horarios del alumno.

import { CalendarPlus, Copy, Pencil, Plus, Repeat, Search, Trash2, User, X } from "lucide-react";
import { type FormEvent, useDeferredValue, useMemo, useState } from "react";
import { useEliminarGrupo, useGuardarGrupo, useMateriasAdmin, useOfertaAdmin } from "../../api/admin";
import HorarioGrid, { aBloqueGrid, DIAS_ORDEN, NOMBRE_DIA } from "../../components/HorarioGrid";
import { Card, EncabezadoPagina, ErrorState, Skeleton } from "../../components/ui";
import { tituloBonito } from "../../lib/desempeno";
import { coincide, normalizarTexto } from "../../lib/formato";
import type { BloqueOferta, DiaSemana, GrupoAdmin, GrupoAdminEntrada, MateriaAdmin } from "../../types/api";
import { Boton, BotonIcono, Campo, claseInput, Confirmar, MensajeError, Modal } from "./componentes";

const DIA_CORTO: Record<DiaSemana, string> = { lunes: "Lun", martes: "Mar", miercoles: "Mié", jueves: "Jue", viernes: "Vie", sabado: "Sáb" };

/** "27/1" → "Ene–Jun 2027" */
const textoPeriodo = (p: string) => {
  const [aa, t] = p.split("/");
  const anio = 2000 + Number(aa);
  return t === "1" ? `Ene–Jun ${anio}` : t === "2" ? `Ago–Dic ${anio}` : t?.toUpperCase() === "V" ? `Verano ${anio}` : p;
};
const ordenPeriodo = (p: string) => { const [aa, t] = p.split("/"); return Number(aa) * 10 + ({ "1": 1, V: 2, v: 2, "2": 3 }[t] ?? 0); };

export default function AdminOferta() {
  const oferta = useOfertaAdmin();
  const materias = useMateriasAdmin({});
  const [periodoSel, setPeriodoSel] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const busqueda = normalizarTexto(useDeferredValue(texto).trim());

  const [editando, setEditando] = useState<{ grupo: GrupoAdmin | null; base?: GrupoAdminEntrada } | null>(null);
  const [borrando, setBorrando] = useState<GrupoAdmin | null>(null);
  const eliminar = useEliminarGrupo();

  const periodos = useMemo(() => [...new Set((oferta.data ?? []).map((g) => g.periodo))].sort((a, b) => ordenPeriodo(b) - ordenPeriodo(a)), [oferta.data]);
  const periodo = periodoSel ?? periodos[0] ?? "27/1";
  const grupos = useMemo(
    () => (oferta.data ?? []).filter((g) => g.periodo === periodo && coincide(busqueda, g.clave, g.nombre, g.docente ?? "")),
    [oferta.data, periodo, busqueda],
  );
  const materiasConGrupo = new Set(grupos.map((g) => g.materiaId)).size;

  const duplicar = (g: GrupoAdmin) => {
    const letras = new Set((oferta.data ?? []).filter((x) => x.materiaId === g.materiaId && x.periodo === g.periodo).map((x) => x.grupo));
    let letra = "A";
    while (letras.has(letra)) letra = String.fromCharCode(letra.charCodeAt(0) + 1);
    setEditando({ grupo: null, base: { materiaId: g.materiaId, periodo: g.periodo, grupo: letra, docente: null, cupo: g.cupo, bloques: g.bloques } });
  };

  return (
    <div>
      <EncabezadoPagina titulo="Oferta de grupos" subtitulo="Grupos del próximo periodo con su horario: con esto el alumno arma su horario en el Generador">
        <Boton onClick={() => setEditando({ grupo: null })} disabled={!materias.data}><Plus className="size-4" /> Nuevo grupo</Boton>
      </EncabezadoPagina>

      <Card className="mb-4 flex flex-col gap-3 p-3! md:flex-row md:items-center">
        <select aria-label="Periodo" value={periodo} onChange={(e) => setPeriodoSel(e.target.value)} className={`${claseInput} md:w-56`}>
          {periodos.length === 0 && <option value={periodo}>{textoPeriodo(periodo)}</option>}
          {periodos.map((p) => <option key={p} value={p}>{textoPeriodo(p)} ({p})</option>)}
        </select>
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por materia, clave o docente…" className={`${claseInput} pl-9`} />
        </label>
      </Card>

      {oferta.isPending ? (
        <Card className="flex flex-col gap-3">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-12" />)}</Card>
      ) : oferta.error ? (
        <ErrorState mensaje={oferta.error.message} onReintentar={() => oferta.refetch()} />
      ) : (
        <Card className="overflow-hidden p-0!">
          <div className="border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
            <b className="text-slate-800">{grupos.length}</b> grupos de {materiasConGrupo} materias en {textoPeriodo(periodo)}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3">Materia</th>
                  <th className="px-3 py-3 text-center">Grupo</th>
                  <th className="px-3 py-3">Docente</th>
                  <th className="px-3 py-3 text-center">Cupo</th>
                  <th className="px-3 py-3">Horario</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grupos.map((g) => (
                  <tr key={g.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-2.5">
                      <p className="font-semibold text-slate-800">{tituloBonito(g.nombre)}</p>
                      <p className="font-mono text-xs text-slate-400">{g.clave}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center"><span className="inline-grid size-7 place-items-center rounded-lg bg-marca-50 font-bold text-marca-700">{g.grupo}</span></td>
                    <td className="px-3 py-2.5 text-slate-600">{g.docente ?? <span className="text-slate-300">Por asignar</span>}</td>
                    <td className="px-3 py-2.5 text-center text-slate-600 tabular-nums">{g.cupo}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex max-w-80 flex-wrap gap-1">
                        {g.bloques.map((b, i) => (
                          <span key={i} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] whitespace-nowrap text-slate-600 tabular-nums">
                            <b className="text-slate-700">{DIA_CORTO[b.dia]}</b> {b.inicio}–{b.fin}{b.salon ? ` · ${b.salon}` : ""}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">
                      <BotonIcono titulo="Duplicar como otro grupo" onClick={() => duplicar(g)}><Copy className="size-4" /></BotonIcono>
                      <BotonIcono titulo={`Editar grupo ${g.grupo} de ${g.clave}`} onClick={() => setEditando({ grupo: g })}><Pencil className="size-4" /></BotonIcono>
                      <BotonIcono titulo={`Eliminar grupo ${g.grupo} de ${g.clave}`} peligro onClick={() => { eliminar.reset(); setBorrando(g); }}><Trash2 className="size-4" /></BotonIcono>
                    </td>
                  </tr>
                ))}
                {grupos.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <CalendarPlus className="mx-auto mb-2 size-8 text-slate-300" />
                    No hay grupos {busqueda ? "con esa búsqueda" : "en este periodo"}.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editando && materias.data && (
        <FormularioGrupo
          key={editando.grupo?.id ?? "nuevo"}
          grupo={editando.grupo}
          base={editando.base}
          periodoInicial={periodo}
          materias={materias.data}
          onCerrar={() => setEditando(null)}
        />
      )}

      <Confirmar
        abierto={borrando !== null}
        titulo="Eliminar grupo"
        mensaje={<>¿Eliminar el grupo <b>{borrando?.grupo}</b> de <b>{borrando && tituloBonito(borrando.nombre)}</b> ({borrando && textoPeriodo(borrando.periodo)})? Dejará de aparecer en el Generador de horarios.</>}
        onCancelar={() => setBorrando(null)}
        onConfirmar={() => borrando && eliminar.mutate(borrando.id, { onSuccess: () => setBorrando(null) })}
        cargando={eliminar.isPending}
        error={eliminar.error?.message}
      />
    </div>
  );
}

// ---------------- Formulario ----------------

const bloqueVacio = (dia: DiaSemana = "lunes"): BloqueOferta => ({ dia, inicio: "07:00", fin: "09:00", salon: null });

function FormularioGrupo({ grupo, base, periodoInicial, materias, onCerrar }: {
  grupo: GrupoAdmin | null; base?: GrupoAdminEntrada; periodoInicial: string; materias: MateriaAdmin[]; onCerrar: () => void;
}) {
  const guardar = useGuardarGrupo();
  const [f, setF] = useState<GrupoAdminEntrada>(() => grupo
    ? { materiaId: grupo.materiaId, periodo: grupo.periodo, grupo: grupo.grupo, docente: grupo.docente, cupo: grupo.cupo, bloques: grupo.bloques.map((b) => ({ ...b })) }
    : base ?? { materiaId: materias[0]?.id ?? 0, periodo: periodoInicial, grupo: "A", docente: null, cupo: 30, bloques: [bloqueVacio()] });

  const set = <K extends keyof GrupoAdminEntrada>(k: K, v: GrupoAdminEntrada[K]) => setF((x) => ({ ...x, [k]: v }));
  const setBloque = (i: number, cambios: Partial<BloqueOferta>) => set("bloques", f.bloques.map((b, j) => (j === i ? { ...b, ...cambios } : b)));
  const agregarBloque = () => {
    const ultimo = f.bloques.at(-1);
    const siguiente = ultimo ? DIAS_ORDEN[Math.min(DIAS_ORDEN.indexOf(ultimo.dia) + 1, DIAS_ORDEN.length - 1)] : "lunes";
    set("bloques", [...f.bloques, ultimo ? { ...ultimo, dia: siguiente } : bloqueVacio()]);
  };
  /** Copia el primer bloque a lunes–viernes (el caso más común en la oferta). */
  const repetirLV = () => {
    const b = f.bloques[0] ?? bloqueVacio();
    set("bloques", (["lunes", "martes", "miercoles", "jueves", "viernes"] as DiaSemana[]).map((dia) => ({ ...b, dia })));
  };

  const porSemestre = useMemo(() => {
    const m = new Map<number, MateriaAdmin[]>();
    for (const x of [...materias].sort((a, b) => a.semestre - b.semestre || a.clave.localeCompare(b.clave))) m.set(x.semestre, [...(m.get(x.semestre) ?? []), x]);
    return [...m.entries()];
  }, [materias]);
  const materia = materias.find((m) => m.id === f.materiaId);

  // Vista previa con la misma cuadrícula que ve el alumno
  const validos = f.bloques.filter((b) => /^\d{2}:\d{2}$/.test(b.inicio) && /^\d{2}:\d{2}$/.test(b.fin) && b.fin > b.inicio);
  const preview = validos.map((b) => aBloqueGrid({ ...b, clave: materia?.clave ?? "", nombre: materia?.nombre ?? "Materia", grupo: f.grupo }, 0));
  const horaIni = preview.length ? Math.floor(Math.min(...preview.map((b) => b.inicioMin)) / 60) : 7;
  const horaFin = preview.length ? Math.ceil(Math.max(...preview.map((b) => b.finMin)) / 60) : 9;
  const dias = DIAS_ORDEN.filter((d) => d !== "sabado" || validos.some((b) => b.dia === "sabado"));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    guardar.mutate({
      id: grupo?.id,
      datos: { ...f, grupo: f.grupo.trim().toUpperCase(), periodo: f.periodo.trim().toUpperCase(), docente: f.docente?.trim() || null,
        bloques: f.bloques.map((b) => ({ ...b, salon: b.salon?.trim() || null })) },
    }, { onSuccess: onCerrar });
  };

  return (
    <Modal titulo={grupo ? `Editar grupo ${grupo.grupo} · ${grupo.clave}` : "Nuevo grupo"} abierto onCerrar={onCerrar} ancho="max-w-3xl">
      <form onSubmit={enviar} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
          <Campo etiqueta="Materia" className="col-span-2 sm:col-span-6">
            {(id) => (
              <select id={id} value={f.materiaId} onChange={(e) => set("materiaId", Number(e.target.value))} className={claseInput}>
                {porSemestre.map(([s, ms]) => (
                  <optgroup key={s} label={`Semestre ${s}`}>
                    {ms.map((m) => <option key={m.id} value={m.id}>{m.clave} · {tituloBonito(m.nombre)}</option>)}
                  </optgroup>
                ))}
              </select>
            )}
          </Campo>
          <Campo etiqueta="Periodo" className="col-span-2 sm:col-span-2" ayuda='Formato "27/1", "27/2" o "27/V"'>
            {(id) => <input id={id} required value={f.periodo} onChange={(e) => set("periodo", e.target.value)} className={`${claseInput} font-mono`} />}
          </Campo>
          <Campo etiqueta="Grupo">
            {(id) => <input id={id} required maxLength={5} value={f.grupo} onChange={(e) => set("grupo", e.target.value)} className={`${claseInput} uppercase`} />}
          </Campo>
          <Campo etiqueta="Cupo">
            {(id) => <input id={id} type="number" min={0} max={500} value={f.cupo} onChange={(e) => set("cupo", Number(e.target.value))} className={claseInput} />}
          </Campo>
          <Campo etiqueta="Docente" className="col-span-2 sm:col-span-2">
            {(id) => <input id={id} value={f.docente ?? ""} onChange={(e) => set("docente", e.target.value)} className={claseInput} placeholder="Por asignar" />}
          </Campo>
        </div>

        {/* Bloques */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-500">Horario ({f.bloques.length} bloques)</p>
            <div className="flex gap-2">
              <Boton type="button" variante="secundario" className="px-3! py-1.5! text-xs" onClick={repetirLV} title="Copia el primer bloque a lunes, martes, miércoles, jueves y viernes">
                <Repeat className="size-3.5" /> Repetir de lunes a viernes
              </Boton>
              <Boton type="button" variante="secundario" className="px-3! py-1.5! text-xs" onClick={agregarBloque}><Plus className="size-3.5" /> Bloque</Boton>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {f.bloques.map((b, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr] gap-2 rounded-xl border border-slate-200 p-2 sm:grid-cols-[130px_1fr_1fr_1fr_auto] sm:items-center sm:border-0 sm:p-0">
                <select aria-label={`Día del bloque ${i + 1}`} value={b.dia} onChange={(e) => setBloque(i, { dia: e.target.value as DiaSemana })} className={`${claseInput} col-span-2 sm:col-span-1`}>
                  {DIAS_ORDEN.map((d) => <option key={d} value={d}>{NOMBRE_DIA[d]}</option>)}
                </select>
                <input aria-label={`Inicio del bloque ${i + 1}`} type="time" step={1800} value={b.inicio} onChange={(e) => setBloque(i, { inicio: e.target.value })} className={claseInput} />
                <input aria-label={`Fin del bloque ${i + 1}`} type="time" step={1800} value={b.fin} onChange={(e) => setBloque(i, { fin: e.target.value })} className={claseInput} />
                <input aria-label={`Salón del bloque ${i + 1}`} value={b.salon ?? ""} onChange={(e) => setBloque(i, { salon: e.target.value })} placeholder="Salón" className={claseInput} />
                <button type="button" onClick={() => set("bloques", f.bloques.filter((_, j) => j !== i))} disabled={f.bloques.length === 1}
                  className="justify-self-end rounded-lg p-2 text-slate-400 hover:bg-bajo-suave hover:text-bajo disabled:opacity-30 disabled:hover:bg-transparent" aria-label={`Quitar bloque ${i + 1}`}>
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {preview.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <User className="size-3.5" /> Así lo verá el alumno
            </p>
            <HorarioGrid bloques={preview} dias={dias} horaInicio={horaIni} horaFin={Math.max(horaFin, horaIni + 1)} marcarHoy={false} />
          </div>
        )}

        {guardar.error && <MensajeError>{guardar.error.message}</MensajeError>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={guardar.isPending}>{grupo ? "Guardar cambios" : "Crear grupo"}</Boton>
        </div>
      </form>
    </Modal>
  );
}
