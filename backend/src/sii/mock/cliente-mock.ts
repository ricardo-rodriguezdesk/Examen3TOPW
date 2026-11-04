// Cliente SII simulado: mismas respuestas y mismo formato que el SII real, con datos FICTICIOS.
// Sirve para desarrollar sin depender del SII y como respaldo si el SII se cae en la exposición.
//
// Credenciales de prueba:  usuario 99030001  ·  contraseña demo123

import type { ClienteSii } from "../cliente.js";
import { errores } from "../../utils/errors.js";
import { calificacionesMock, estudianteMock, horariosMock, kardexMock } from "./datos.js";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

function tokenFalso(): string {
  const ahora = Math.floor(Date.now() / 1000);
  return [b64({ typ: "JWT", alg: "none" }), b64({ iss: "mock-sii", sub: 1, iat: ahora, exp: ahora + 3600 }), "firma-mock"].join(".");
}

function validar(token: string) {
  try {
    const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (p.iss !== "mock-sii" || p.exp * 1000 < Date.now()) throw 0;
  } catch {
    throw errores.sesionExpirada();
  }
}

const espera = () => new Promise((r) => setTimeout(r, 250 + Math.random() * 400)); // latencia realista

export const clienteMock: ClienteSii = {
  async login(email, password) {
    await espera();
    if (email !== "l99030001@celaya.tecnm.mx" || password !== "demo123") throw errores.credenciales();
    return tokenFalso();
  },
  async estudiante(t) { await espera(); validar(t); return estudianteMock; },
  async calificaciones(t) { await espera(); validar(t); return calificacionesMock; },
  async kardex(t) { await espera(); validar(t); return kardexMock; },
  async horarios(t) { await espera(); validar(t); return horariosMock; },
};
