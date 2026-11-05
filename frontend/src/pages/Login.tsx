import clsx from "clsx";
import { AlertCircle, Clock, Eye, EyeOff, Loader2, Map, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router";
import { ApiError } from "../api/cliente";
import { useLogin, useSesion } from "../api/hooks";
import FondoPantalla from "../components/FondoPantalla";
import IconoApp from "../components/IconoApp";

export default function Login() {
  const sesion = useSesion();
  const login = useLogin();
  const location = useLocation();
  const [params] = useSearchParams();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);

  const destino = (location.state as { desde?: string } | null)?.desde ?? "/";
  if (sesion.data?.autenticado) return <Navigate to={destino} replace />;

  const expirada = params.get("motivo") === "expirada";

  const vacioUsuario = tocado && !usuario.trim();
  const vacioPassword = tocado && !password;

  function enviar(e: FormEvent) {
    e.preventDefault();
    setTocado(true);
    setErrorLocal(null);
    if (!usuario.trim() || !password) {
      setErrorLocal("Escribe tu número de control y tu contraseña.");
      return;
    }
    // Al tener éxito, useLogin marca la sesión como activa y el <Navigate> de arriba lleva a `destino`.
    login.mutate({ usuario: usuario.trim(), password });
  }

  const errorServidor = login.error instanceof ApiError ? login.error.message : login.error ? "Ocurrió un error inesperado." : null;
  const mensajeError = errorLocal ?? errorServidor;

  return (
    <div className="relative grid min-h-full place-items-center overflow-hidden px-4 py-10">
      <FondoPantalla />

      <main className="relative w-full max-w-[380px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <IconoApp tam="size-[72px]" />
          <h1 className="mt-4 text-[28px] leading-tight font-bold text-slate-900">SII Planner</h1>
          <p className="mt-1 text-[15px] text-slate-600">Tu trayectoria académica, clara y planeada.</p>
        </div>

        <form onSubmit={enviar} noValidate className="vidrio rounded-[28px] p-5">
          {expirada && !mensajeError && (
            <div className="mb-4 flex gap-2 rounded-[14px] bg-medio-suave px-3 py-2.5 text-[14px] text-medio">
              <Clock className="mt-0.5 size-4 shrink-0" /> Tu sesión expiró. Vuelve a iniciar sesión.
            </div>
          )}
          {mensajeError && (
            <div role="alert" className="mb-4 flex gap-2 rounded-[14px] bg-bajo-suave px-3 py-2.5 text-[14px] text-bajo">
              <AlertCircle className="mt-0.5 size-4 shrink-0" /> {mensajeError}
            </div>
          )}

          {/* Campos agrupados, como en los formularios de iOS */}
          <div className="overflow-hidden rounded-[14px] bg-superficie">
            <label className={clsx("flex items-center gap-3 px-4", vacioUsuario && "bg-bajo-suave")}>
              <span className="w-24 shrink-0 text-[15px] font-medium text-slate-900">Usuario</span>
              <input
                id="usuario" autoComplete="username" autoFocus placeholder="Número de control"
                value={usuario} onChange={(e) => setUsuario(e.target.value)} aria-invalid={vacioUsuario}
                className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="ml-4 h-px bg-separador" />
            <label className={clsx("flex items-center gap-3 px-4", vacioPassword && "bg-bajo-suave")}>
              <span className="w-24 shrink-0 text-[15px] font-medium text-slate-900">Contraseña</span>
              <input
                id="password" type={verPassword ? "text" : "password"} autoComplete="current-password" placeholder="Del SII"
                value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={vacioPassword}
                className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="button" onClick={() => setVerPassword((v) => !v)}
                aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="-mr-1 rounded-full p-1.5 text-slate-400 hover:text-slate-600"
              >
                {verPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            </label>
          </div>
          <p className="mt-2 px-1 text-[12px] text-slate-500">También puedes escribir tu correo institucional.</p>

          <button
            type="submit" disabled={login.isPending}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-marca-500 px-4 py-3.5 text-[17px] font-semibold text-white transition hover:bg-marca-800 active:scale-[0.98] disabled:opacity-70"
          >
            {login.isPending ? <><Loader2 className="size-5 animate-spin" /> Conectando con el SII…</> : "Iniciar sesión"}
          </button>
        </form>

        <ul className="mt-6 flex flex-col gap-2.5 px-2 text-[14px] text-slate-700">
          <li className="flex items-center gap-3"><Map className="size-[18px] text-marca-500" /> Mapa de tu retícula con su seriación</li>
          <li className="flex items-center gap-3"><Clock className="size-[18px] text-marca-500" /> Horarios sin choques para el próximo semestre</li>
          <li className="flex items-center gap-3"><ShieldCheck className="size-[18px] text-marca-500" /> Tu contraseña solo viaja al SII</li>
        </ul>
        <p className="mt-8 text-center text-[12px] text-slate-500">Tecnológico Nacional de México · Campus Celaya</p>
      </main>
    </div>
  );
}
