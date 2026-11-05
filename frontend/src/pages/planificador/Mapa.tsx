// Planificador · Mapa de retícula (Persona B) — CONTEXTO.md §7 y §10 (B3).
// React Flow: una columna por semestre, nodos coloreados por estado, flechas desde los requisitos.
// Al hacer clic en una materia se resalta su cadena de seriación y se abre el panel de detalle.

import "@xyflow/react/dist/style.css";
import {
  Background, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Link2, Lock, Percent, MousePointerClick, RotateCcw, X } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useAvance } from "../../api/planificador";
import { Badge, Card, EncabezadoPagina, ErrorState, Skeleton } from "../../components/ui";
import { desempenoDe, estiloDesempeno, tituloBonito } from "../../lib/desempeno";
import { estiloEstado, ORDEN_ESTADOS, useEspecialidad } from "../../lib/planificador";
import type { EstadoMateria, MateriaAvance as MateriaPlan } from "../../types/api";

const COL_W = 236; // ancho de columna (semestre)
const NODO_W = 200;
const FILA_H = 96;
const TOP = 56; // espacio para el encabezado del semestre

type DatosNodo = { m: MateriaPlan; atenuado: boolean; foco: "seleccion" | "relacion" | null };
type NodoMateria = Node<DatosNodo, "materia">;
type NodoEncabezado = Node<{ semestre: number; creditos: number }, "encabezado">;

// ---------------- Nodos ----------------

function VistaMateria({ data }: NodeProps<NodoMateria>) {
  const { m, atenuado, foco } = data;
  const e = estiloEstado[m.estado];
  return (
    <div
      className={clsx(
        "rounded-[14px] border px-3 py-2 transition-all duration-200",
        e.nodo,
        atenuado && "opacity-25",
        foco === "seleccion" && "ring-4 ring-marca-500/40",
        foco === "relacion" && "shadow-[0_4px_14px_rgb(0_0_0/0.12)]",
      )}
      style={{ width: NODO_W }}
    >
      <Handle id="izq" type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-slate-400" />
      <Handle id="arriba" type="target" position={Position.Top} className="!size-1 !border-0 !bg-transparent" />
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold text-slate-500">{m.clave}</span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
          {m.estado === "bloqueada" && <Lock className="size-3" />}
          {m.calificacion ?? `${m.creditos} cr`}
        </span>
      </div>
      <p className={clsx("mt-0.5 line-clamp-2 text-xs leading-tight font-bold", m.estado === "bloqueada" ? "text-slate-400" : "text-slate-800")}>
        {tituloBonito(m.nombre)}
      </p>
      <Handle id="der" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-slate-400" />
      <Handle id="abajo" type="source" position={Position.Bottom} className="!size-1 !border-0 !bg-transparent" />
    </div>
  );
}

function VistaEncabezado({ data }: NodeProps<NodoEncabezado>) {
  return (
    <div className="text-center" style={{ width: NODO_W }}>
      <p className="text-[15px] font-semibold text-slate-900">Semestre {data.semestre}</p>
      <p className="text-[11px] text-slate-400">{data.creditos} créditos</p>
    </div>
  );
}

const tiposNodo = { materia: VistaMateria, encabezado: VistaEncabezado };

// ---------------- Página ----------------

export default function Mapa() {
  const { especialidad } = useEspecialidad();
  const { data, isPending, error, refetch } = useAvance(especialidad);
  const [params, setParams] = useSearchParams();
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const filtro = (params.get("estado") as EstadoMateria | null) ?? null;

  const porClave = useMemo(() => new Map((data?.materias ?? []).map((m) => [m.clave, m])), [data]);

  // Cadena de seriación de la materia seleccionada: lo que pide (antes) y lo que libera (después)
  const relacion = useMemo(() => {
    const antes = new Set<string>(), despues = new Set<string>();
    if (!seleccion || !data) return { antes, despues };
    const subir = (c: string) => porClave.get(c)?.requisitos.forEach((r) => { if (!antes.has(r)) { antes.add(r); subir(r); } });
    const bajar = (c: string) => data.materias.filter((m) => m.requisitos.includes(c)).forEach((m) => { if (!despues.has(m.clave)) { despues.add(m.clave); bajar(m.clave); } });
    subir(seleccion); bajar(seleccion);
    return { antes, despues };
  }, [seleccion, data, porClave]);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    const semestres = [...new Set(data.materias.map((m) => m.semestreSugerido))].sort((a, b) => a - b);
    const nodes: Node[] = [];
    for (const s of semestres) {
      const delSemestre = data.materias.filter((m) => m.semestreSugerido === s);
      const x = (s - 1) * COL_W;
      nodes.push({
        id: `sem-${s}`, type: "encabezado", position: { x, y: 0 }, selectable: false, draggable: false,
        data: { semestre: s, creditos: delSemestre.reduce((t, m) => t + m.creditos, 0) },
      });
      delSemestre.forEach((m, i) => {
        const enCadena = m.clave === seleccion || relacion.antes.has(m.clave) || relacion.despues.has(m.clave);
        const atenuado = seleccion ? !enCadena : filtro ? m.estado !== filtro : false;
        nodes.push({
          id: m.clave, type: "materia", position: { x, y: TOP + i * FILA_H },
          data: { m, atenuado, foco: m.clave === seleccion ? "seleccion" : enCadena ? "relacion" : null },
        } satisfies NodoMateria);
      });
    }
    const edges: Edge[] = data.materias.flatMap((m) =>
      m.requisitos.filter((r) => porClave.has(r)).map((r) => {
        // Flecha de la cadena: requisito previo → (previo | seleccionada)  ó  (seleccionada | liberada) → liberada
        const activa = seleccion !== null && (
          (relacion.antes.has(r) && (m.clave === seleccion || relacion.antes.has(m.clave)))
          || (relacion.despues.has(m.clave) && (r === seleccion || relacion.despues.has(r)))
        );
        const pendiente = porClave.get(m.clave)?.requisitosPendientes.includes(r);
        return {
          id: `${r}->${m.clave}`, source: r, target: m.clave, sourceHandle: "der", targetHandle: "izq", type: "smoothstep",
          animated: activa,
          style: {
            stroke: activa ? "var(--color-marca-500)" : pendiente ? "var(--color-bajo)" : "var(--color-slate-400)",
            strokeWidth: activa ? 2.5 : 1.5,
            opacity: seleccion && !activa ? 0.12 : filtro && !seleccion ? 0.35 : 0.9,
          },
        };
      }),
    );

    // Co-requisitos (se cursan juntas): línea punteada sin flecha, una sola por pareja
    const fila = new Map(nodes.map((n) => [n.id, n.position]));
    const vistos = new Set<string>();
    for (const m of data.materias) {
      for (const c of m.correquisitos.filter((x) => porClave.has(x))) {
        const par = [m.clave, c].sort().join("~");
        if (vistos.has(par)) continue;
        vistos.add(par);
        const [a, b] = [m.clave, c].sort((x, y) => (fila.get(x)!.x - fila.get(y)!.x) || (fila.get(x)!.y - fila.get(y)!.y));
        const mismaColumna = fila.get(a)!.x === fila.get(b)!.x;
        const enCadena = seleccion !== null && [a, b].includes(seleccion);
        edges.push({
          id: `co:${par}`, source: a, target: b, type: "smoothstep",
          sourceHandle: mismaColumna ? "abajo" : "der", targetHandle: mismaColumna ? "arriba" : "izq",
          style: {
            stroke: enCadena ? "var(--color-morado)" : "var(--color-morado-suave)", strokeWidth: enCadena ? 2.5 : 1.5, strokeDasharray: "5 4",
            opacity: seleccion && !enCadena ? 0.12 : filtro && !seleccion ? 0.35 : 0.9,
          },
        });
      }
    }
    return { nodes, edges };
  }, [data, seleccion, relacion, filtro, porClave]);

  if (isPending) return <div><Skeleton className="mb-2 h-8 w-56" /><Skeleton className="mb-6 h-4 w-80" /><Skeleton className="h-[70vh] w-full rounded-[22px]" /></div>;
  if (error) return <ErrorState mensaje={error.message} onReintentar={() => refetch()} />;

  const elegida = seleccion ? porClave.get(seleccion) ?? null : null;
  // Al abrir, el mapa se centra en lo que el alumno está cursando ("estás aquí")
  const cursando = data.materias.filter((m) => m.estado === "cursando");
  const enfoqueInicial = cursando.length
    ? [...cursando.map((m) => ({ id: m.clave })), ...[...new Set(cursando.map((m) => m.semestreSugerido))].map((s) => ({ id: `sem-${s}` }))]
    : undefined;
  const cambiarFiltro = (e: EstadoMateria | null) => {
    setSeleccion(null);
    setParams(e ? { estado: e } : {}, { replace: true });
  };

  return (
    <div>
      <EncabezadoPagina titulo="Mapa de retícula" subtitulo={`${data.plan.nombre} · ${data.materias.length} materias`} />

      {/* Leyenda que también filtra */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {ORDEN_ESTADOS.map((e) => {
          const n = data.materias.filter((m) => m.estado === e).length;
          return (
            <button
              key={e} onClick={() => cambiarFiltro(filtro === e ? null : e)} aria-pressed={filtro === e}
              className={clsx(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                filtro === e ? "border-marca-500 bg-marca-50 text-marca-700" : "border-slate-200 bg-superficie text-slate-600 hover:bg-slate-50",
              )}
            >
              <span className={clsx("size-2.5 rounded-full", estiloEstado[e].punto)} />
              {estiloEstado[e].etiqueta} <span className="text-slate-400 tabular-nums">{n}</span>
            </button>
          );
        })}
        <span className="ml-auto hidden items-center gap-4 text-xs text-slate-500 md:flex">
          <span className="flex items-center gap-1.5"><svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" style={{ stroke: "var(--color-slate-400)" }} strokeWidth="2" /></svg>Pre-requisito</span>
          <span className="flex items-center gap-1.5"><svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" style={{ stroke: "var(--color-morado-suave)" }} strokeWidth="2" strokeDasharray="5 4" /></svg>Co-requisito</span>
        </span>
        {filtro && (
          <button onClick={() => cambiarFiltro(null)} className="inline-flex items-center gap-1 px-2 text-xs font-semibold text-slate-400 hover:text-slate-700">
            <X className="size-3.5" /> Quitar filtro
          </button>
        )}
      </div>

      <div className="relative flex flex-col gap-4">
        <div className="relative h-[68vh] min-h-[460px] overflow-hidden rounded-[22px] bg-superficie">
          <ReactFlow
            nodes={nodes} edges={edges} nodeTypes={tiposNodo}
            onNodeClick={(_, n) => n.type === "materia" && setSeleccion(n.id === seleccion ? null : n.id)}
            onPaneClick={() => setSeleccion(null)}
            nodesDraggable={false} nodesConnectable={false} edgesFocusable={false}
            fitView fitViewOptions={{ padding: 0.06, minZoom: 0.62, maxZoom: 1, nodes: enfoqueInicial }} minZoom={0.25} maxZoom={1.6}
          >
            <Background gap={24} />
            <Controls showInteractive={false} position="bottom-left" />
          </ReactFlow>
          {!elegida && (
            <p className="pointer-events-none absolute top-3 right-3 z-10 hidden items-center gap-1.5 vidrio rounded-full px-3 py-1.5 text-[13px] text-slate-600 shadow-sm sm:flex">
              <MousePointerClick className="size-3.5" /> Haz clic en una materia para ver su seriación
            </p>
          )}
        </div>

        {elegida && <PanelDetalle m={elegida} porClave={porClave} libera={relacion.despues} onElegir={setSeleccion} />}
      </div>
    </div>
  );
}

// ---------------- Panel lateral ----------------

function PanelDetalle({ m, porClave, libera, onElegir }: {
  m: MateriaPlan; porClave: Map<string, MateriaPlan>; libera: Set<string>; onElegir: (c: string | null) => void;
}) {
  const e = estiloEstado[m.estado];
  const directas = [...libera].map((c) => porClave.get(c)!).filter((x) => x.requisitos.includes(m.clave));
  const tono = m.estado === "aprobada" ? "alto" : m.estado === "reprobada" ? "bajo" : m.estado === "cursando" ? "marca" : "neutro";

  return (
    <Card className="flex w-full flex-col gap-4 lg:absolute lg:top-3 lg:right-3 lg:z-10 lg:max-h-[calc(100%-1.5rem)] lg:w-80 lg:overflow-y-auto lg:rounded-[24px] lg:vidrio">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-slate-400">{m.clave}</p>
          <h2 className="text-lg leading-snug font-bold text-slate-900">{tituloBonito(m.nombre)}</h2>
        </div>
        <button onClick={() => onElegir(null)} className="grid size-7 place-items-center rounded-full bg-relleno text-slate-500" aria-label="Cerrar"><X className="size-4" /></button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge tono={tono}><span className={clsx("size-2 rounded-full", e.punto)} />{e.etiqueta}</Badge>
        <Badge>{m.creditos} créditos</Badge>
        <Badge>Semestre {m.semestreSugerido}</Badge>
        {m.porcentajeRequerido !== null && <Badge tono={m.faltaPorcentaje ? "bajo" : "neutro"}><Percent className="size-3" />{m.porcentajeRequerido} % de créditos</Badge>}
        {m.tipo !== "basica" && <Badge tono="marca">{m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)}</Badge>}
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-[14px] bg-relleno p-3">
          <dt className="text-xs text-slate-500">Calificación</dt>
          <dd className={clsx("text-xl font-bold tabular-nums", m.calificacion !== null ? estiloDesempeno[desempenoDe(m.calificacion)].texto : "text-slate-300")}>
            {m.calificacion ?? "—"}
          </dd>
        </div>
        <div className="rounded-[14px] bg-relleno p-3">
          <dt className="flex items-center gap-1 text-xs text-slate-500"><RotateCcw className="size-3" /> Intentos</dt>
          <dd className={clsx("text-xl font-bold tabular-nums", m.intentos > 1 ? "text-medio" : "text-slate-800")}>{m.intentos}</dd>
        </div>
      </dl>

      {(m.requisitosPendientes.length > 0 || m.faltaPorcentaje) && (
        <div className="rounded-[14px] bg-bajo-suave p-3 text-[14px] text-bajo">
          <p className="flex items-center gap-1 font-bold"><Lock className="size-3.5" /> Bloqueada</p>
          <ul className="mt-1 list-disc pl-5">
            {(() => {
              // requisitosPendientes trae pre-requisitos sin acreditar y co-requisitos que aún no se pueden inscribir
              const co = m.requisitosPendientes.filter((c) => m.correquisitos.includes(c));
              const pre = m.requisitosPendientes.filter((c) => !co.includes(c));
              const nombres = (cs: string[]) => cs.map((c) => tituloBonito(porClave.get(c)?.nombre ?? c)).join(", ");
              return (<>
                {pre.length > 0 && <li>Primero debes acreditar {nombres(pre)}.</li>}
                {co.length > 0 && <li>Se cursa junto con {nombres(co)}, que todavía no puedes inscribir.</li>}
              </>);
            })()}
            {m.faltaPorcentaje && <li>Necesitas el {m.porcentajeRequerido} % de los créditos de la carrera.</li>}
          </ul>
        </div>
      )}

      <ListaRelacion titulo="Requiere" icono={<ArrowLeft className="size-3.5" />} claves={m.requisitos} porClave={porClave} onElegir={onElegir}
        vacio="Sin requisitos: se puede cursar desde el inicio." />
      {m.correquisitos.length > 0 && (
        <ListaRelacion titulo="Se cursa junto con" icono={<Link2 className="size-3.5" />} claves={m.correquisitos} porClave={porClave} onElegir={onElegir} vacio="" />
      )}
      <ListaRelacion titulo="Desbloquea" icono={<ArrowRight className="size-3.5" />} claves={directas.map((d) => d.clave)} porClave={porClave} onElegir={onElegir}
        vacio="No es requisito de otra materia." />
    </Card>
  );
}

function ListaRelacion({ titulo, icono, claves, porClave, onElegir, vacio }: {
  titulo: string; icono: ReactNode; claves: string[]; porClave: Map<string, MateriaPlan>; onElegir: (c: string) => void; vacio: string;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-500">{icono}{titulo}</p>
      {claves.length === 0 ? <p className="text-sm text-slate-400">{vacio}</p> : (
        <ul className="flex flex-col gap-1">
          {claves.map((c) => {
            const r = porClave.get(c);
            if (!r) return null;
            return (
              <li key={c}>
                <button onClick={() => onElegir(c)} className="flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-[15px] hover:bg-relleno">
                  <span className={clsx("size-2.5 shrink-0 rounded-full", estiloEstado[r.estado].punto)} />
                  <span className="min-w-0 flex-1 truncate text-slate-700">{tituloBonito(r.nombre)}</span>
                  <span className="text-xs text-slate-400">{estiloEstado[r.estado].etiqueta}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
