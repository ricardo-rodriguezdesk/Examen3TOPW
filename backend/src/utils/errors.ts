// Errores de la aplicación con código estable para que el frontend sepa qué mostrar.

export type CodigoError =
  | "CAMPOS_VACIOS"
  | "CREDENCIALES_INVALIDAS"
  | "SESION_REQUERIDA"
  | "SESION_EXPIRADA"
  | "SII_NO_DISPONIBLE"
  | "SII_RESPUESTA_INVALIDA"
  | "DEMASIADOS_INTENTOS"
  | "NO_ENCONTRADO"
  | "ERROR_INTERNO";

export class AppError extends Error {
  constructor(
    public status: number,
    public codigo: CodigoError,
    message: string,
  ) {
    super(message);
  }
}

export const errores = {
  camposVacios: () => new AppError(400, "CAMPOS_VACIOS", "Escribe tu número de control (o correo) y tu contraseña."),
  credenciales: () => new AppError(401, "CREDENCIALES_INVALIDAS", "Número de control o contraseña incorrectos."),
  sesionRequerida: () => new AppError(401, "SESION_REQUERIDA", "Inicia sesión para continuar."),
  sesionExpirada: () => new AppError(401, "SESION_EXPIRADA", "Tu sesión expiró. Vuelve a iniciar sesión."),
  siiCaido: () => new AppError(503, "SII_NO_DISPONIBLE", "El SII no está disponible en este momento. Intenta más tarde."),
  siiInvalido: () => new AppError(502, "SII_RESPUESTA_INVALIDA", "El SII respondió con un formato inesperado."),
};
