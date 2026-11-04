// Subnavegación del Planificador (pestañas). Las páginas hijas se dibujan en <Outlet />.
import clsx from "clsx";
import { NavLink, Outlet } from "react-router";

const pestanas = [
  { a: "/planificador", texto: "Avance", end: true },
  { a: "/planificador/mapa", texto: "Mapa de retícula", end: false },
  { a: "/planificador/generador", texto: "Generador de horarios", end: false },
];

export default function PlanificadorLayout() {
  return (
    <div>
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
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
      <Outlet />
    </div>
  );
}
