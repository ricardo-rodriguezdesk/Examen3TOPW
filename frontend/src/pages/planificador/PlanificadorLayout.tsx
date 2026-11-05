// Subnavegación del Planificador (pestañas) y selector de especialidad. Las páginas hijas se dibujan en <Outlet />.
// La especialidad elegida se comparte con Avance, Mapa y Generador por el contexto del Outlet (useEspecialidad()).
import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { useAvance } from "../../api/planificador";
import type { ContextoPlanificador } from "../../lib/planificador";

const pestanas = [
  { a: "/planificador", texto: "Avance", end: true },
  { a: "/planificador/mapa", texto: "Mapa de retícula", end: false },
  { a: "/planificador/generador", texto: "Generador de horarios", end: false },
];

const CLAVE_LS = "planificador.especialidad";
const leer = () => { try { return localStorage.getItem(CLAVE_LS) ?? undefined; } catch { return undefined; } };

export default function PlanificadorLayout() {
  const [especialidad, setEsp] = useState<string | undefined>(leer);
  const { data } = useAvance(especialidad);

  const setEspecialidad = (c: string | undefined) => {
    setEsp(c);
    try { if (c) localStorage.setItem(CLAVE_LS, c); else localStorage.removeItem(CLAVE_LS); } catch { /* sin almacenamiento */ }
  };
  const contexto: ContextoPlanificador = { especialidad, setEspecialidad };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {pestanas.map((p) => (
            <NavLink
              key={p.a} to={p.a} end={p.end}
              className={({ isActive }) => clsx(
                "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition",
                isActive ? "bg-white text-marca-700 shadow-sm" : "text-slate-500 hover:text-slate-800",
              )}
            >
              {p.texto}
            </NavLink>
          ))}
        </nav>

        {data && data.especialidades.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="shrink-0 font-semibold text-slate-500">Especialidad</span>
            <select
              value={especialidad ?? data.especialidad?.clave ?? ""}
              onChange={(e) => setEspecialidad(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-marca-500 focus:ring-2 focus:ring-marca-100 lg:max-w-72"
            >
              {data.especialidades.map((e) => <option key={e.clave} value={e.clave}>{e.nombre}</option>)}
            </select>
            {data.especialidad?.detectada && !especialidad && (
              <span title="Detectada con tu kardex" className="hidden shrink-0 items-center gap-1 rounded-full bg-alto-suave px-2 py-1 text-[11px] font-bold text-alto sm:inline-flex">
                <Sparkles className="size-3" /> Detectada
              </span>
            )}
          </label>
        )}
      </div>
      <Outlet context={contexto} />
    </div>
  );
}
