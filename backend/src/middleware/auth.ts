// Middleware de sesión: lee el token del SII desde la cookie httpOnly.
// El token NUNCA llega al JavaScript del navegador.

import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { errores } from "../utils/errors.js";
import { msRestantes } from "../utils/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      siiToken?: string;
    }
  }
}

export const opcionesCookie = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeMs,
});

export function limpiarSesion(res: Response) {
  res.clearCookie(config.cookieName, { ...opcionesCookie(0), maxAge: undefined });
}

export function requiereSesion(req: Request, res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.[config.cookieName];
  if (!token) return next(errores.sesionRequerida());
  if (msRestantes(token) <= 0) {
    limpiarSesion(res);
    return next(errores.sesionExpirada());
  }
  req.siiToken = token;
  next();
}
