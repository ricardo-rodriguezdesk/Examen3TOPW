import clsx from "clsx";
import {
  BookOpenCheck, CalendarDays, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Map, type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useEstudiante, useLogout } from "../api/hooks";
import { tituloBonito } from "../lib/desempeno";

const secciones: { a: string; texto: string; icono: LucideIcon }[] = [
  { a: "/", texto: "Inicio", icono: LayoutDashboard },
  { a: "/calificaciones", texto: "Calificaciones", icono: BookOpenCheck },
  { a: "/kardex", texto: "Kardex", icono: ClipboardList },
  { a: "/horario", texto: "Horario", icono: CalendarDays },
  { a: "/planificador", texto: "Planificador", icono: Map },
];

export default function AppLayout() {
  const { data: estudiante } = useEstudiante();
  const logout = useLogout();
  const navigate = useNavigate();
  const [fotoRota, setFotoRota] = useState(false);

  const salir = () => logout.mutate(undefined, { onSettled: () => navigate("/login", { replace: true }) });
  const nombre = estudiante ? tituloBonito(estudiante.nombre.split(" ").slice(0, 2).join(" ")) : "";
  const iniciales = estudiante?.nombre.split(" ").slice(0, 2).map((p) => p[0]).join("") ?? "";

  return (
    <div className="flex min-h-full">
      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2 pt-2">
          <div className="grid size-9 place-items-center rounded-xl bg-marca-700 text-white"><GraduationCap className="size-5" /></div>
          <span className="text-lg font-bold tracking-tight">SII Planner</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {secciones.map(({ a, texto, icono: Icono }) => (
            <NavLink
              key={a} to={a} end={a === "/"}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                isActive ? "bg-marca-50 text-marca-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
            >
              <Icono className="size-5" /> {texto}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
          {estudiante?.foto && !fotoRota
            ? <img src={estudiante.foto} alt="" onError={() => setFotoRota(true)} className="size-9 rounded-full object-cover" />
            : <div className="grid size-9 place-items-center rounded-full bg-marca-100 text-sm font-bold text-marca-700">{iniciales}</div>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{nombre || "…"}</p>
            <p className="text-xs text-slate-400">{estudiante?.numeroControl}</p>
          </div>
          <button onClick={salir} title="Cerrar sesión" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-bajo">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Encabezado (móvil) */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-marca-700 text-white"><GraduationCap className="size-4" /></div>
            <span className="font-bold">SII Planner</span>
          </div>
          <button onClick={salir} className="flex items-center gap-1 text-sm text-slate-500"><LogOut className="size-4" /> Salir</button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 sm:p-8 md:pb-8">
          <Outlet />
        </main>

        {/* Navegación inferior (móvil) */}
        <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden">
          {secciones.map(({ a, texto, icono: Icono }) => (
            <NavLink
              key={a} to={a} end={a === "/"}
              className={({ isActive }) => clsx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", isActive ? "text-marca-700" : "text-slate-400")}
            >
              <Icono className="size-5" /> {texto}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
