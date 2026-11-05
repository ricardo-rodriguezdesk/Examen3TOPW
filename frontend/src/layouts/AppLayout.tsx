// Layout de la app del alumno, estilo iOS 27 / iPadOS 27.
// - Escritorio: barra lateral de vidrio (Liquid Glass) que flota sobre el fondo.
// - Celular: barra de pestañas flotante en cápsula de vidrio y barra superior que se difumina al hacer scroll.
import clsx from "clsx";
import {
  BookOpenCheck, CalendarDays, ClipboardList, House, LogOut, Map, type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useEstudiante, useLogout } from "../api/hooks";
import IconoApp from "../components/IconoApp";
import { tituloBonito } from "../lib/desempeno";

const secciones: { a: string; texto: string; icono: LucideIcon }[] = [
  { a: "/", texto: "Inicio", icono: House },
  { a: "/calificaciones", texto: "Calificaciones", icono: BookOpenCheck },
  { a: "/kardex", texto: "Kardex", icono: ClipboardList },
  { a: "/horario", texto: "Horario", icono: CalendarDays },
  { a: "/planificador", texto: "Planificador", icono: Map },
];

export default function AppLayout() {
  const { data: estudiante } = useEstudiante();
  const logout = useLogout();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [fotoRota, setFotoRota] = useState(false);
  const [menuEn, setMenuEn] = useState<string | null>(null); // ruta donde se abrió el menú: al navegar se cierra solo
  const menu = menuEn === pathname;
  const setMenu = (abierto: boolean) => setMenuEn(abierto ? pathname : null);
  const [conScroll, setConScroll] = useState(() => window.scrollY > 8);
  const menuRef = useRef<HTMLDivElement>(null);

  // La barra superior (celular) solo se difumina cuando hay contenido pasando por debajo
  useEffect(() => {
    const f = () => setConScroll(window.scrollY > 8);
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const cerrar = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuEn(null); };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [menu]);

  const salir = () => logout.mutate(undefined, { onSettled: () => navigate("/login", { replace: true }) });
  const nombre = estudiante ? tituloBonito(estudiante.nombre.split(" ").slice(0, 2).join(" ")) : "";
  const iniciales = estudiante?.nombre.split(" ").slice(0, 2).map((p) => p[0]).join("") ?? "";

  const avatar = (tam: string) => estudiante?.foto && !fotoRota
    ? <img src={estudiante.foto} alt="" onError={() => setFotoRota(true)} className={clsx(tam, "rounded-full object-cover")} />
    : <div className={clsx(tam, "grid place-items-center rounded-full bg-gradient-to-b from-slate-300 to-slate-400 text-[13px] font-semibold text-white")}>{iniciales}</div>;

  return (
    <div className="flex min-h-full">
      {/* ---------- Barra lateral (escritorio) ---------- */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 p-3 md:block">
        <div className="vidrio flex h-full flex-col rounded-[26px] p-3">
          <div className="mb-6 flex items-center gap-3 px-2 pt-2">
            <IconoApp />
            <span className="text-[17px] font-semibold tracking-tight">SII Planner</span>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5" aria-label="Secciones">
            {secciones.map(({ a, texto, icono: Icono }) => (
              <NavLink
                key={a} to={a} end={a === "/"}
                className={({ isActive }) => clsx(
                  "flex items-center gap-3 rounded-[12px] px-3 py-2 text-[15px] font-medium transition-colors",
                  isActive ? "bg-marca-500 text-white" : "text-slate-900 hover:bg-relleno",
                )}
              >
                {({ isActive }) => (<><Icono className={clsx("size-[19px]", isActive ? "text-white" : "text-marca-500")} /> {texto}</>)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 rounded-[16px] bg-relleno p-2.5">
            {avatar("size-9")}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold">{nombre || "…"}</p>
              <p className="text-[12px] text-slate-500 tabular-nums">{estudiante?.numeroControl}</p>
            </div>
            <button onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión" className="rounded-full p-2 text-slate-500 transition hover:bg-relleno hover:text-bajo">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ---------- Barra superior (celular) ---------- */}
        <header className={clsx("sticky top-0 z-20 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),10px)] pb-2.5 transition-colors md:hidden", conScroll && "borde-scroll")}>
          <div className="flex items-center gap-2">
            <IconoApp tam="size-7" />
            <span className={clsx("text-[15px] font-semibold transition-opacity", conScroll ? "opacity-100" : "opacity-0")}>SII Planner</span>
          </div>
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenu(!menu)} aria-label="Tu cuenta" aria-expanded={menu} className="rounded-full transition active:scale-95">{avatar("size-8")}</button>
            {menu && (
              <div className="vidrio absolute top-11 right-0 w-60 rounded-[18px] p-1.5">
                <div className="px-3 py-2">
                  <p className="truncate text-[15px] font-semibold">{nombre}</p>
                  <p className="text-[13px] text-slate-500 tabular-nums">{estudiante?.numeroControl}</p>
                </div>
                <div className="mx-3 h-px bg-separador" />
                <button onClick={salir} className="mt-1 flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-[15px] text-bajo hover:bg-relleno">
                  Cerrar sesión <LogOut className="size-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-2 pb-32 sm:px-8 md:pt-10 md:pb-12">
          <Outlet />
        </main>

        {/* ---------- Barra de pestañas flotante (celular) ---------- */}
        <nav aria-label="Secciones" className="vidrio fixed inset-x-2.5 bottom-[max(env(safe-area-inset-bottom),12px)] z-20 grid grid-cols-5 rounded-full p-1 md:hidden">
          {secciones.map(({ a, texto, icono: Icono }) => (
            <NavLink
              key={a} to={a} end={a === "/"}
              className={({ isActive }) => clsx(
                "flex min-w-0 flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-semibold transition-colors",
                isActive ? "bg-relleno text-marca-500" : "text-slate-900",
              )}
            >
              <Icono className="size-[22px]" /> <span className="max-w-full truncate tracking-[-0.02em]">{texto}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
