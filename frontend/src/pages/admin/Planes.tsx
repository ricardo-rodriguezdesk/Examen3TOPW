// Administración · Planes de estudio y especialidades (Persona B).

import { BookMarked, GraduationCap, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import {
  type EspecialidadAdminEntrada, type PlanAdminEntrada,
  useEliminarEspecialidad, useEliminarPlan, useGuardarEspecialidad, useGuardarPlan, usePlanesAdmin,
} from "../../api/admin";
import { Card, EncabezadoPagina, ErrorState, Skeleton } from "../../components/ui";
import type { PlanAdmin } from "../../types/api";
import { Boton, BotonIcono, Campo, claseInput, Confirmar, MensajeError, Modal } from "./componentes";

type Esp = PlanAdmin["especialidades"][number];
type Edicion =
  | { tipo: "plan"; plan: PlanAdmin | null }
  | { tipo: "esp"; planId: number; esp: Esp | null };
type Borrado = { tipo: "plan"; plan: PlanAdmin } | { tipo: "esp"; esp: Esp };

export default function AdminPlanes() {
  const planes = usePlanesAdmin();
  const [editando, setEditando] = useState<Edicion | null>(null);
  const [borrando, setBorrando] = useState<Borrado | null>(null);
  const eliminarPlan = useEliminarPlan();
  const eliminarEsp = useEliminarEspecialidad();
  const eliminar = borrando?.tipo === "plan" ? eliminarPlan : eliminarEsp;

  return (
    <div>
      <EncabezadoPagina titulo="Planes de estudio" subtitulo="Cada plan tiene su tronco común y sus módulos de especialidad">
        <Boton onClick={() => setEditando({ tipo: "plan", plan: null })}><Plus className="size-4" /> Nuevo plan</Boton>
      </EncabezadoPagina>

      {planes.isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : planes.error ? (
        <ErrorState mensaje={planes.error.message} onReintentar={() => planes.refetch()} />
      ) : planes.data.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">No hay planes. Crea el primero.</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {planes.data.map((p) => (
            <Card key={p.id} className="p-0!">
              <div className="flex flex-wrap items-start gap-4 border-b border-slate-100 p-5">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-marca-50 text-marca-700"><GraduationCap className="size-6" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-slate-400">{p.clave}</p>
                  <h2 className="text-lg font-bold text-slate-900">{p.nombre}</h2>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                    <span><b className="text-slate-800 tabular-nums">{p.creditosTotales}</b> créditos para egresar</span>
                    <Link to="/admin" className="hover:text-marca-700"><b className="text-slate-800 tabular-nums">{p.materias}</b> materias en la retícula</Link>
                    <span><b className="text-slate-800 tabular-nums">{p.especialidades.length}</b> especialidades</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <BotonIcono titulo={`Editar plan ${p.clave}`} onClick={() => setEditando({ tipo: "plan", plan: p })}><Pencil className="size-4" /></BotonIcono>
                  <BotonIcono titulo={`Eliminar plan ${p.clave}`} peligro onClick={() => { eliminarPlan.reset(); setBorrando({ tipo: "plan", plan: p }); }}><Trash2 className="size-4" /></BotonIcono>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700"><Layers className="size-4 text-marca-500" /> Especialidades</h3>
                  <Boton variante="secundario" className="px-3! py-1.5! text-xs" onClick={() => setEditando({ tipo: "esp", planId: p.id, esp: null })}>
                    <Plus className="size-3.5" /> Especialidad
                  </Boton>
                </div>
                {p.especialidades.length === 0 ? (
                  <p className="text-sm text-slate-400">Este plan no tiene especialidades.</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {p.especialidades.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                        <BookMarked className="size-4 shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{e.nombre}</p>
                          <p className="text-xs text-slate-400"><span className="font-mono">{e.clave}</span> · {e.materias} materias</p>
                        </div>
                        <BotonIcono titulo={`Editar ${e.clave}`} onClick={() => setEditando({ tipo: "esp", planId: p.id, esp: e })}><Pencil className="size-4" /></BotonIcono>
                        <BotonIcono titulo={`Eliminar ${e.clave}`} peligro onClick={() => { eliminarEsp.reset(); setBorrando({ tipo: "esp", esp: e }); }}><Trash2 className="size-4" /></BotonIcono>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editando?.tipo === "plan" && <FormularioPlan plan={editando.plan} onCerrar={() => setEditando(null)} />}
      {editando?.tipo === "esp" && <FormularioEspecialidad planId={editando.planId} esp={editando.esp} onCerrar={() => setEditando(null)} />}

      <Confirmar
        abierto={borrando !== null}
        titulo={borrando?.tipo === "plan" ? "Eliminar plan" : "Eliminar especialidad"}
        mensaje={borrando?.tipo === "plan"
          ? <>¿Eliminar el plan <b>{borrando.plan.nombre}</b>? Se borrarán también sus <b>{borrando.plan.materias} materias</b>, sus especialidades y toda su oferta. No se puede deshacer.</>
          : <>¿Eliminar la especialidad <b>{borrando?.tipo === "esp" && borrando.esp.nombre}</b>? Se borrarán también sus <b>{borrando?.tipo === "esp" && borrando.esp.materias} materias</b> y sus grupos.</>}
        onCancelar={() => setBorrando(null)}
        onConfirmar={() => {
          if (!borrando) return;
          const cerrar = { onSuccess: () => setBorrando(null) };
          if (borrando.tipo === "plan") eliminarPlan.mutate(borrando.plan.id, cerrar);
          else eliminarEsp.mutate(borrando.esp.id, cerrar);
        }}
        cargando={eliminar.isPending}
        error={eliminar.error?.message}
      />
    </div>
  );
}

function FormularioPlan({ plan, onCerrar }: { plan: PlanAdmin | null; onCerrar: () => void }) {
  const guardar = useGuardarPlan();
  const [f, setF] = useState<PlanAdminEntrada>({ clave: plan?.clave ?? "", nombre: plan?.nombre ?? "", creditosTotales: plan?.creditosTotales ?? 260 });
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    guardar.mutate({ id: plan?.id, datos: { ...f, clave: f.clave.trim().toUpperCase(), nombre: f.nombre.trim() } }, { onSuccess: onCerrar });
  };
  return (
    <Modal titulo={plan ? `Editar ${plan.clave}` : "Nuevo plan de estudios"} abierto onCerrar={onCerrar} ancho="max-w-lg">
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo etiqueta="Clave" ayuda="Ej. ISIC-2010-224">
          {(id) => <input id={id} required value={f.clave} onChange={(e) => setF({ ...f, clave: e.target.value })} className={`${claseInput} font-mono uppercase`} />}
        </Campo>
        <Campo etiqueta="Nombre de la carrera">
          {(id) => <input id={id} required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={claseInput} />}
        </Campo>
        <Campo etiqueta="Créditos para egresar">
          {(id) => <input id={id} type="number" min={1} max={1000} required value={f.creditosTotales} onChange={(e) => setF({ ...f, creditosTotales: Number(e.target.value) })} className={claseInput} />}
        </Campo>
        {guardar.error && <MensajeError>{guardar.error.message}</MensajeError>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={guardar.isPending}>{plan ? "Guardar cambios" : "Crear plan"}</Boton>
        </div>
      </form>
    </Modal>
  );
}

function FormularioEspecialidad({ planId, esp, onCerrar }: { planId: number; esp: Esp | null; onCerrar: () => void }) {
  const guardar = useGuardarEspecialidad();
  const [f, setF] = useState<EspecialidadAdminEntrada>({ planId, clave: esp?.clave ?? "", nombre: esp?.nombre ?? "" });
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    guardar.mutate({ id: esp?.id, datos: { ...f, clave: f.clave.trim().toUpperCase(), nombre: f.nombre.trim() } }, { onSuccess: onCerrar });
  };
  return (
    <Modal titulo={esp ? `Editar ${esp.clave}` : "Nueva especialidad"} abierto onCerrar={onCerrar} ancho="max-w-lg">
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo etiqueta="Clave" ayuda="Ej. ISIE-IDP-2025-01">
          {(id) => <input id={id} required value={f.clave} onChange={(e) => setF({ ...f, clave: e.target.value })} className={`${claseInput} font-mono uppercase`} />}
        </Campo>
        <Campo etiqueta="Nombre">
          {(id) => <input id={id} required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={claseInput} />}
        </Campo>
        {guardar.error && <MensajeError>{guardar.error.message}</MensajeError>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={guardar.isPending}>{esp ? "Guardar cambios" : "Crear especialidad"}</Boton>
        </div>
      </form>
    </Modal>
  );
}
