// Rutas académicas: piden los datos al SII con el token de la cookie y los entregan normalizados.

import { Router } from "express";
import { requiereSesion } from "../middleware/auth.js";
import { sii } from "../sii/cliente.js";
import {
  normalizarCalificaciones, normalizarEstudiante, normalizarHorario, normalizarKardex,
} from "../sii/normalizar.js";

export const academicoRouter = Router();
academicoRouter.use(requiereSesion);

academicoRouter.get("/estudiante", async (req, res) => {
  res.json(normalizarEstudiante(await sii.estudiante(req.siiToken!)));
});

academicoRouter.get("/calificaciones", async (req, res) => {
  res.json(normalizarCalificaciones(await sii.calificaciones(req.siiToken!)));
});

academicoRouter.get("/kardex", async (req, res) => {
  res.json(normalizarKardex(await sii.kardex(req.siiToken!)));
});

academicoRouter.get("/horario", async (req, res) => {
  res.json(normalizarHorario(await sii.horarios(req.siiToken!)));
});
