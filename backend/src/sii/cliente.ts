// Cliente HTTP hacia la API del SII ITC.
// Es la ÚNICA parte del backend que sabe hablar con el SII.

import { config } from "../config.js";
import { errores } from "../utils/errors.js";
import type {
  SiiCalificacionesPeriodo, SiiEnvoltura, SiiEstudiante, SiiHorarioPeriodo, SiiKardex, SiiLoginRespuesta,
} from "./tipos-sii.js";
import { clienteMock } from "./mock/cliente-mock.js";

export interface ClienteSii {
  login(email: string, password: string): Promise<string>; // devuelve el token
  estudiante(token: string): Promise<SiiEstudiante>;
  calificaciones(token: string): Promise<SiiCalificacionesPeriodo[]>;
  kardex(token: string): Promise<SiiKardex>;
  horarios(token: string): Promise<SiiHorarioPeriodo[]>;
}

async function pedir(ruta: string, init: RequestInit = {}): Promise<{ status: number; json: unknown }> {
  let res: Response;
  try {
    res = await fetch(config.siiBaseUrl + ruta, {
      ...init,
      headers: { Accept: "application/json", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(config.siiTimeoutMs),
    });
  } catch {
    throw errores.siiCaido(); // red caída, DNS, timeout…
  }
  if (res.status >= 500) throw errores.siiCaido();
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw errores.siiInvalido();
  }
  return { status: res.status, json };
}

async function obtener<T>(ruta: string, token: string): Promise<T> {
  const { status, json } = await pedir(ruta, { headers: { Authorization: `Bearer ${token}` } });
  // Los endpoints protegidos SÍ usan HTTP 401 real: {"error":"Token is invalid or expired"}
  if (status === 401 || status === 403) throw errores.sesionExpirada();
  const env = json as SiiEnvoltura<T>;
  if (!env || typeof env !== "object" || !("data" in env)) throw errores.siiInvalido();
  return env.data;
}

const clienteReal: ClienteSii = {
  async login(email, password) {
    const { json } = await pedir("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    // OJO: el SII responde HTTP 200 siempre. El resultado real viene en el cuerpo.
    const r = json as SiiLoginRespuesta;
    const token = r?.message?.login?.token;
    if (r?.status === 401 || r?.flag !== "success" || !token) throw errores.credenciales();
    return token;
  },
  estudiante: (t) => obtener("/movil/estudiante", t),
  calificaciones: (t) => obtener("/movil/estudiante/calificaciones", t),
  kardex: (t) => obtener("/movil/estudiante/kardex", t),
  horarios: (t) => obtener("/movil/estudiante/horarios", t),
};

export const sii: ClienteSii = config.siiMode === "mock" ? clienteMock : clienteReal;
