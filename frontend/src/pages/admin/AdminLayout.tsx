// Layout del panel de administración (Persona B).
// TODO (B): proteger estas rutas con la sesión de admin (GET /api/admin/sesion) igual que RutaProtegida.
import clsx from "clsx";
import { ShieldCheck } from "lucide-react";
import { NavLink, Outlet } from "react-router";

const secciones = [
  { a: "/admin", texto: "Materias", end: true },
  { a: "/admin/oferta", texto: "Oferta de grupos", end: false },
];

export default function AdminLayout() {
  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-marca-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
          <span className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5" /> SII Planner · Admin</span>
          <nav className="flex gap-1">
            {secciones.map((s) => (
              <NavLink
                key={s.a} to={s.a} end={s.end}
                className={({ isActive }) => clsx("rounded-lg px-3 py-1.5 text-sm font-semibold", isActive ? "bg-white/15" : "text-marca-200 hover:text-white")}
              >
                {s.texto}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6"><Outlet /></main>
    </div>
  );
}
