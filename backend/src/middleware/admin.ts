// Sesión de ADMINISTRADOR (independiente del SII).
// Cookie httpOnly firmada con HMAC-SHA256: "usuario.expiracion.firma". Dura 8 horas.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { AppError } from "../utils/errors.js";

const DURACION_MS = 8 * 60 * 60 * 1000;

const firmar = (datos: string) => createHmac("sha256", config.adminSecreto).update(datos).digest("base64url");

export function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function crearSesionAdmin(res: Response, usuario: string): number {
  const exp = Date.now() + DURACION_MS;
  const datos = `${Buffer.from(usuario).toString("base64url")}.${exp}`;
  res.cookie(config.adminCookie, `${datos}.${firmar(datos)}`, {
    httpOnly: true, secure: config.isProd, sameSite: "lax", path: "/", maxAge: DURACION_MS,
  });
  return exp;
}

export function cerrarSesionAdmin(res: Response) {
  res.clearCookie(config.adminCookie, { httpOnly: true, secure: config.isProd, sameSite: "lax", path: "/" });
}

/** Devuelve { usuario, exp } si la cookie es válida y vigente. */
export function leerSesionAdmin(req: Request): { usuario: string; exp: number } | null {
  const valor: string | undefined = req.cookies?.[config.adminCookie];
  if (!valor) return null;
  const partes = valor.split(".");
  if (partes.length !== 3) return null;
  const [u, exp, firma] = partes;
  if (!iguales(firma, firmar(`${u}.${exp}`))) return null;
  if (Number(exp) < Date.now()) return null;
  return { usuario: Buffer.from(u, "base64url").toString(), exp: Number(exp) };
}

export function requiereAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!leerSesionAdmin(req)) return next(new AppError(401, "ADMIN_REQUERIDO", "Inicia sesión como administrador."));
  next();
}
