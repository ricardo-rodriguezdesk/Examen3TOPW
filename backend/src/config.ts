import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  siiMode: (process.env.SII_MODE ?? "real") as "real" | "mock",
  siiBaseUrl: process.env.SII_BASE_URL ?? "https://sii.celaya.tecnm.mx/api",
  siiEmailDomain: process.env.SII_EMAIL_DOMAIN ?? "celaya.tecnm.mx",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  isProd: process.env.NODE_ENV === "production",
  cookieName: "sii_token",
  siiTimeoutMs: 15000,

  // ---- Planificador ----
  databaseUrl: process.env.DATABASE_URL ?? "",          // Neon en producción; vacío = PGlite local
  pgliteDir: process.env.PGLITE_DIR ?? "./.pglite",     // "memory" para no guardar nada en disco
  especialidadPorDefecto: process.env.ESPECIALIDAD_POR_DEFECTO ?? "ISIE-IDP-2025-01",

  // ---- Administración (usuario propio, NO usa el SII) ----
  adminUsuario: process.env.ADMIN_USER ?? (process.env.NODE_ENV === "production" ? "" : "admin"),
  adminPassword: process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "admin123"),
  adminSecreto: process.env.ADMIN_SECRET ?? "solo-desarrollo-cambiar-en-produccion",
  adminCookie: "sii_admin",
};
