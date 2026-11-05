// Cliente HTTP del frontend. TODAS las llamadas al backend pasan por aquí.
// - Manda la cookie de sesión (credentials: "include").
// - Convierte errores del backend en ApiError con código y mensaje listos para mostrar.
// - Si la sesión expiró, avisa a la app para regresar al login.

import type { CodigoError, RespuestaError } from "../types/api";

export class ApiError extends Error {
  status: number;
  codigo: CodigoError | "SIN_CONEXION";
  constructor(status: number, codigo: CodigoError | "SIN_CONEXION", message: string) {
    super(message);
    this.status = status;
    this.codigo = codigo;
  }
}

export const EVENTO_SESION_EXPIRADA = "sesion-expirada";

export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${ruta}`, {
      ...opciones,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(opciones.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, "SIN_CONEXION", "No hay conexión con el servidor. Revisa tu internet.");
  }

  if (res.ok) return res.json() as Promise<T>;

  let cuerpo: Partial<RespuestaError> = {};
  try { cuerpo = await res.json(); } catch { /* respuesta sin JSON */ }

  const codigo = cuerpo.error ?? "ERROR_INTERNO";
  if (codigo === "SESION_EXPIRADA" || codigo === "SESION_REQUERIDA") {
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA, { detail: codigo }));
  }
  throw new ApiError(res.status, codigo, cuerpo.mensaje ?? "Ocurrió un error inesperado.");
}

export const post = <T>(ruta: string, cuerpo?: unknown) =>
  api<T>(ruta, { method: "POST", body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });

export const put = <T>(ruta: string, cuerpo: unknown) => api<T>(ruta, { method: "PUT", body: JSON.stringify(cuerpo) });
export const del = <T>(ruta: string) => api<T>(ruta, { method: "DELETE" });
