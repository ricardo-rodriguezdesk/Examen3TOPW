// Layout del panel de administración (Persona B).
// Protegido con la sesión de admin (GET /api/admin/sesion). Si cualquier petición responde ADMIN_REQUERIDO
// (la cookie expiró a media sesión), regresa al login de admin.
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { BookMarked, CalendarRange, ExternalLink, LayoutList, LogOut, ShieldCheck, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { Link, Navigate, NavLink, Outlet, useNavigate } from "react-router";
import { useLogoutAdmin, useSesionAdmin } from "../../api/admin";
import { ApiError } from "../../api/cliente";

const secciones: { a: string; texto: string; icono: LucideIcon; end: boolean }[] = [
  { a: "/admin", texto: "Materias", icono: LayoutList, end: true },
  { a: "/admin/oferta", texto: "Oferta de grupos", icono: CalendarRange, end: false },
  { a: "/admin/planes", texto: "Planes", icono: BookMarked, end: false },
];

export default function AdminLayout() {
  const sesion = useSesionAdmin();
  const logout = useLogoutAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Sesión de admin vencida durante el uso → al login
  useEffect(() => {
    const vencida = (e: unknown) => e instanceof ApiError && e.codigo === "ADMIN_REQUERIDO";
    const salir = () => { qc.removeQueries({ queryKey: ["admin"] }); navigate("/admin/login?motivo=expirada", { replace: true }); };
    const q = qc.getQueryCache().subscribe((ev) => { if (ev.type === "updated" && vencida(ev.query.state.error)) salir(); });
    const m = qc.getMutationCache().subscribe((ev) => { if (ev.type === "updated" && vencida(ev.mutation?.state.error)) salir(); });
    return () => { q(); m(); };
  }, [qc, navigate]);

  if (sesion.isPending) {
    return <div className="grid h-full place-items-center"><div className="size-10 animate-spin rounded-full border-4 border-marca-100 border-t-marca-600" /></div>;
  }
  if (!sesion.data?.autenticado) return <Navigate to="/admin/login" replace />;

  const salir = () => logout.mutate(undefined, { onSettled: () => navigate("/admin/login", { replace: true }) });

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 bg-marca-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5" /> SII Planner · Admin</span>
          <nav className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {secciones.map(({ a, texto, icono: Icono, end }) => (
              <NavLink
                key={a} to={a} end={end}
                className={({ isActive }) => clsx(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold",
                  isActive ? "bg-white/15 text-white" : "text-marca-200 hover:text-white",
                )}
              >
                <Icono className="size-4" /> {texto}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link to="/" className="hidden items-center gap-1 text-marca-200 hover:text-white md:flex"><ExternalLink className="size-4" /> App del alumno</Link>
            <span className="hidden text-marca-200 sm:inline">{sesion.data.usuario}</span>
            <button onClick={salir} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">
              <LogOut className="size-4" /> Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6"><Outlet /></main>
    </div>
  );
}
