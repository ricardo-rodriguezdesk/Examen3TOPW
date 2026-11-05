import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { limpiarSesion, opcionesCookie } from "../middleware/auth.js";
import { sii } from "../sii/cliente.js";
import { AppError, errores } from "../utils/errors.js";
import { decodificarJwt, msRestantes } from "../utils/jwt.js";

export const authRouter = Router();

// Máximo 10 intentos de login cada 15 min POR CUENTA (evita fuerza bruta y bloqueos de cuenta en el SII).
// Se limita por número de control y no por IP: detrás del rewrite de Vercel muchas personas
// pueden llegar con la misma IP y se bloquearían entre sí.
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => "cuenta:" + armarEmail(String(req.body?.usuario ?? "")),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) =>
    next(new AppError(429, "DEMASIADOS_INTENTOS", "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.")),
});

/**
 * El alumno puede escribir:
 *   "20030123"  ·  "L20030123"  ·  "l20030123@celaya.tecnm.mx"
 * El SII solo acepta el formato  l<número>@celaya.tecnm.mx  (con L minúscula).
 */
export function armarEmail(usuario: string): string {
  const u = usuario.trim().toLowerCase();
  if (u.includes("@")) return u;
  const numero = u.replace(/^l/, "");
  return `l${numero}@${config.siiEmailDomain}`;
}

authRouter.post("/login", limiteLogin, async (req, res) => {
  const usuario = String(req.body?.usuario ?? "").trim();
  const password = String(req.body?.password ?? "");
  if (!usuario || !password) throw errores.camposVacios();

  const token = await sii.login(armarEmail(usuario), password);
  const restante = msRestantes(token) || 60 * 60 * 1000; // si no trae exp, asumimos 60 min

  res.cookie(config.cookieName, token, opcionesCookie(restante));
  res.json({ ok: true, expiraEn: Date.now() + restante });
});

authRouter.post("/logout", (_req, res) => {
  limpiarSesion(res);
  res.json({ ok: true });
});

/** El frontend lo usa al cargar para saber si hay sesión y cuándo expira (sin ver el token). */
authRouter.get("/sesion", (req, res) => {
  const token: string | undefined = req.cookies?.[config.cookieName];
  const restante = token ? msRestantes(token) : 0;
  if (!restante) {
    if (token) limpiarSesion(res);
    return res.json({ autenticado: false });
  }
  const exp = decodificarJwt(token!)?.exp;
  res.json({ autenticado: true, expiraEn: exp ? exp * 1000 : Date.now() + restante });
});
