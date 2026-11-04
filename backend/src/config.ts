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
};
