// Acceso al panel de administración (Persona B). Sesión PROPIA: no usa las credenciales del SII.

import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { useLoginAdmin, useSesionAdmin } from "../../api/admin";
import { Boton, Campo, claseInput, MensajeError } from "./componentes";

export default function LoginAdmin() {
  const sesion = useSesionAdmin();
  const login = useLoginAdmin();
  const [params] = useSearchParams();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [ver, setVer] = useState(false);

  if (sesion.data?.autenticado) return <Navigate to="/admin" replace />;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    // Al entrar, se vuelve a pedir la sesión y el <Navigate> de arriba lleva al panel con la sesión ya actualizada
    login.mutate({ usuario: usuario.trim(), password }, { onSuccess: () => sesion.refetch() });
  };

  return (
    <div className="grid min-h-full place-items-center bg-marca-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/10"><ShieldCheck className="size-6" /></div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Panel de administración</h1>
          <p className="mt-1 text-sm text-marca-200">Retícula, seriación y oferta de grupos del Planificador</p>
        </div>

        <form onSubmit={enviar} className="rounded-2xl bg-white p-6 shadow-2xl">
          {params.get("motivo") === "expirada" && (
            <p className="mb-4 rounded-xl bg-medio-suave px-3 py-2 text-sm text-medio">Tu sesión de administrador expiró. Vuelve a entrar.</p>
          )}
          <div className="flex flex-col gap-4">
            <Campo etiqueta="Usuario">
              {(id) => <input id={id} autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} className={claseInput} autoFocus />}
            </Campo>
            <Campo etiqueta="Contraseña">
              {(id) => (
                <div className="relative">
                  <input id={id} type={ver ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${claseInput} pr-10`} />
                  <button type="button" onClick={() => setVer(!ver)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700" aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}>
                    {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              )}
            </Campo>
          </div>

          {login.error && <MensajeError>{login.error.message}</MensajeError>}

          <Boton type="submit" cargando={login.isPending} className="mt-5 w-full py-2.5">
            <LockKeyhole className="size-4" /> Entrar
          </Boton>
          <p className="mt-4 text-center text-xs text-slate-400">Estas credenciales son del administrador, no las del SII.</p>
        </form>

        <Link to="/" className="mt-5 flex items-center justify-center gap-1.5 text-sm font-semibold text-marca-200 hover:text-white">
          <ArrowLeft className="size-4" /> Volver a la app del alumno
        </Link>
      </div>
    </div>
  );
}
