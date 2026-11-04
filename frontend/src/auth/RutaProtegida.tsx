// Protege las rutas privadas:
//  - Sin sesión → /login
//  - Cuando el token llega a su hora de expiración → /login?motivo=expirada
//  - Si cualquier petición responde SESION_EXPIRADA/REQUERIDA → /login?motivo=expirada

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { EVENTO_SESION_EXPIRADA } from "../api/cliente";
import { claves, useSesion } from "../api/hooks";
import type { Sesion } from "../types/api";

export function RutaProtegida() {
  const { data, isPending, isError } = useSesion();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  useEffect(() => {
    const expirar = () => {
      qc.clear();
      qc.setQueryData<Sesion>(claves.sesion, { autenticado: false });
      navigate("/login?motivo=expirada", { replace: true });
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, expirar);

    let timer: number | undefined;
    if (data?.expiraEn) timer = window.setTimeout(expirar, Math.max(0, data.expiraEn - Date.now()));

    return () => {
      window.removeEventListener(EVENTO_SESION_EXPIRADA, expirar);
      window.clearTimeout(timer);
    };
  }, [data?.expiraEn, navigate, qc]);

  if (isPending) {
    return (
      <div className="grid h-full place-items-center">
        <div className="size-10 animate-spin rounded-full border-4 border-marca-100 border-t-marca-600" />
      </div>
    );
  }
  if (isError || !data?.autenticado) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }
  return <Outlet />;
}
