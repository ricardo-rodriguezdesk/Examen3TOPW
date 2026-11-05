import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { limpiarSesion } from "./middleware/auth.js";
import { db } from "./db/index.js";
import { academicoRouter } from "./routes/academico.js";
import { adminRouter } from "./routes/admin.js";
import { planificadorRouter } from "./routes/planificador.js";
import { authRouter } from "./routes/auth.js";
import { AppError, desdePostgres } from "./utils/errors.js";

export const app = express();

app.set("trust proxy", 1); // detrás del proxy de Render/Vercel (para rate-limit e IPs reales)
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
// En producción el frontend llama vía rewrite de Vercel (mismo dominio) y CORS no se usa.
// En desarrollo permite al Vite local mandar la cookie.
app.use(cors({ origin: config.frontendOrigin, credentials: true }));

app.get("/api/salud", (_req, res) => res.json({ ok: true, modo: config.siiMode }));

// Diagnóstico de despliegue: ¿este servidor puede llegar al SII?
// Hace un login con credenciales vacías (el SII responde 401 en el cuerpo, sin bloquear a nadie).
app.get("/api/salud/sii", async (_req, res) => {
  const inicio = Date.now();
  try {
    const r = await fetch(`${config.siiBaseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: "", password: "" }),
      signal: AbortSignal.timeout(config.siiTimeoutMs),
    });
    res.json({ alcanzable: true, http: r.status, ms: Date.now() - inicio });
  } catch (e) {
    res.status(503).json({ alcanzable: false, error: String((e as Error).cause ?? (e as Error).message), ms: Date.now() - inicio });
  }
});
app.get("/api/salud/bd", async (_req, res) => {
  const d = await db();
  const [r] = await d.query<{ materias: number; grupos: number }>(
    "SELECT (SELECT count(*)::int FROM materias) AS materias, (SELECT count(*)::int FROM grupos) AS grupos",
  );
  res.json({ ok: true, motor: config.databaseUrl ? "postgresql" : "pglite", ...r });
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/planificador", planificadorRouter);
app.use("/api", academicoRouter);

app.use((_req, _res, next) => next(new AppError(404, "NO_ENCONTRADO", "Ruta no encontrada.")));

// Manejador central de errores: siempre responde { error: CODIGO, mensaje }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // JSON mal formado en el cuerpo → 400 (no es un error del servidor)
  if ((err as { type?: string })?.type === "entity.parse.failed") err = new AppError(400, "DATOS_INVALIDOS", "El cuerpo de la petición no es JSON válido.");
  const pg = desdePostgres(err);
  if (pg) err = pg;
  if (err instanceof AppError) {
    if (err.codigo === "SESION_EXPIRADA") limpiarSesion(res);
    return res.status(err.status).json({ error: err.codigo, mensaje: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "ERROR_INTERNO", mensaje: "Ocurrió un error inesperado." });
});
