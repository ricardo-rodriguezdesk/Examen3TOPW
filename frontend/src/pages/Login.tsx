import clsx from "clsx";
import { AlertCircle, ArrowRight, Clock, Eye, EyeOff, GraduationCap, Loader2, Map, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router";
import { ApiError } from "../api/cliente";
import { useLogin, useSesion } from "../api/hooks";

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
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Panel de marca */}
      <aside className="relative hidden overflow-hidden bg-marca-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-marca-600/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <GraduationCap className="size-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">SII Planner</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Tu trayectoria académica,<br />clara y planeada.
          </h1>
          <p className="mt-4 text-lg text-marca-100">
            Consulta calificaciones, kardex y horario del SII, y planea qué materias cursar para egresar a tiempo.
          </p>
          <ul className="mt-8 space-y-3 text-marca-100">
            <li className="flex items-center gap-3"><Map className="size-5 text-sky-300" /> Mapa de tu retícula con seriación</li>
            <li className="flex items-center gap-3"><Clock className="size-5 text-sky-300" /> Generador de horarios sin choques</li>
            <li className="flex items-center gap-3"><ShieldCheck className="size-5 text-sky-300" /> Tus credenciales solo viajan al SII</li>
          </ul>
        </div>

        <p className="relative text-sm text-marca-200">Tecnológico Nacional de México · Campus Celaya</p>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-marca-700 text-white"><GraduationCap className="size-5" /></div>
            <span className="text-lg font-bold">SII Planner</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Inicia sesión</h2>
          <p className="mt-1 text-slate-500">Usa las mismas credenciales del SII.</p>

          {expirada && !mensajeError && (
            <div className="mt-6 flex gap-2 rounded-xl border border-medio/30 bg-medio-suave p-3 text-sm text-medio">
              <Clock className="mt-0.5 size-4 shrink-0" /> Tu sesión expiró. Vuelve a iniciar sesión.
            </div>
          )}
          {mensajeError && (
            <div role="alert" className="mt-6 flex gap-2 rounded-xl border border-bajo/30 bg-bajo-suave p-3 text-sm text-bajo">
              <AlertCircle className="mt-0.5 size-4 shrink-0" /> {mensajeError}
            </div>
          )}

          <form onSubmit={enviar} noValidate className="mt-6 space-y-5">
            <div>
              <label htmlFor="usuario" className="mb-1.5 block text-sm font-semibold text-slate-700">Número de control</label>
              <input
                id="usuario" autoComplete="username" autoFocus placeholder="20030123"
                value={usuario} onChange={(e) => setUsuario(e.target.value)}
                className={clsx(
                  "w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:ring-4",
                  vacioUsuario ? "border-bajo focus:ring-bajo/15" : "border-slate-300 focus:border-marca-500 focus:ring-marca-500/15",
                )}
              />
              <p className="mt-1 text-xs text-slate-400">También puedes escribir tu correo institucional.</p>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">Contraseña</label>
              <div className="relative">
                <input
                  id="password" type={verPassword ? "text" : "password"} autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className={clsx(
                    "w-full rounded-xl border bg-white px-4 py-3 pr-12 outline-none transition focus:ring-4",
                    vacioPassword ? "border-bajo focus:ring-bajo/15" : "border-slate-300 focus:border-marca-500 focus:ring-marca-500/15",
                  )}
                />
                <button
                  type="button" onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 hover:text-slate-600"
                >
                  {verPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={login.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-marca-700 px-4 py-3 font-semibold text-white shadow-lg shadow-marca-700/20 transition hover:bg-marca-800 disabled:opacity-70"
            >
              {login.isPending ? <><Loader2 className="size-5 animate-spin" /> Conectando con el SII…</> : <>Entrar <ArrowRight className="size-5" /></>}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
