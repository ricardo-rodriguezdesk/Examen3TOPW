// Piezas compartidas del panel de administración (Persona B): ventana modal, confirmación, campos y botones.

import clsx from "clsx";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useId } from "react";

export function Modal({ titulo, abierto, onCerrar, children, ancho = "max-w-2xl" }: {
  titulo: string; abierto: boolean; onCerrar: () => void; children: ReactNode; ancho?: string;
}) {
  useEffect(() => {
    if (!abierto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onCerrar}>
      <div
        role="dialog" aria-modal="true" aria-label={titulo}
        className={clsx("flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl", ancho)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X className="size-5" /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Confirmar({ abierto, titulo, mensaje, onCancelar, onConfirmar, cargando, error }: {
  abierto: boolean; titulo: string; mensaje: ReactNode; onCancelar: () => void; onConfirmar: () => void; cargando?: boolean; error?: string | null;
}) {
  return (
    <Modal titulo={titulo} abierto={abierto} onCerrar={onCancelar} ancho="max-w-md">
      <div className="flex gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-bajo-suave text-bajo"><TriangleAlert className="size-5" /></div>
        <div className="text-sm text-slate-600">{mensaje}</div>
      </div>
      {error && <MensajeError>{error}</MensajeError>}
      <div className="mt-6 flex justify-end gap-2">
        <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
        <Boton variante="peligro" onClick={onConfirmar} cargando={cargando}>Eliminar</Boton>
      </div>
    </Modal>
  );
}

export function Boton({ variante = "primario", cargando, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario" | "peligro"; cargando?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || cargando}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variante === "primario" && "bg-marca-700 text-white hover:bg-marca-800",
        variante === "secundario" && "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        variante === "peligro" && "bg-bajo text-white hover:bg-red-800",
        className,
      )}
    >
      {cargando && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export const claseInput =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-marca-500 focus:ring-2 focus:ring-marca-100 disabled:bg-slate-50";

/** Etiqueta + control. El control recibe el id para que la etiqueta sea clicable. */
export function Campo({ etiqueta, ayuda, className, children }: {
  etiqueta: string; ayuda?: string; className?: string; children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold tracking-wide text-slate-500 uppercase">{etiqueta}</label>
      {children(id)}
      {ayuda && <p className="mt-1 text-[11px] text-slate-400">{ayuda}</p>}
    </div>
  );
}

export function MensajeError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-bajo/20 bg-bajo-suave px-3 py-2 text-sm text-bajo">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {children}
    </p>
  );
}

/** Botón de ícono para las acciones de una fila (editar, eliminar). */
export function BotonIcono({ titulo, peligro, onClick, children }: { titulo: string; peligro?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick} title={titulo} aria-label={titulo}
      className={clsx("rounded-lg p-1.5 text-slate-400 transition", peligro ? "hover:bg-bajo-suave hover:text-bajo" : "hover:bg-marca-50 hover:text-marca-700")}
    >
      {children}
    </button>
  );
}
