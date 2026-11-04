// Solo DECODIFICAMOS el JWT del SII para leer su expiración.
// No lo verificamos: la firma la valida el propio SII en cada petición.

export interface PayloadSii {
  iss?: string;
  sub?: string | number;
  iat?: number;
  exp?: number;
}

export function decodificarJwt(token: string): PayloadSii | null {
  try {
    const parte = token.split(".")[1];
    if (!parte) return null;
    return JSON.parse(Buffer.from(parte, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/** Milisegundos que le quedan al token (0 si ya expiró o no se puede leer). */
export function msRestantes(token: string): number {
  const exp = decodificarJwt(token)?.exp;
  if (!exp) return 0;
  return Math.max(0, exp * 1000 - Date.now());
}
