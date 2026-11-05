// Backend de ADMINISTRACIÓN del Planificador (requisito del examen: "su propio backend de administración").
//
//   POST /api/admin/login · POST /api/admin/logout · GET /api/admin/sesion
//   CRUD /api/admin/planes · /api/admin/especialidades · /api/admin/materias · /api/admin/oferta
//   (GET lista · GET /:id · POST crea · PUT /:id actualiza · DELETE /:id)

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { cerrarSesionAdmin, crearSesionAdmin, iguales, leerSesionAdmin, requiereAdmin } from "../middleware/admin.js";
import { AppError, invalido, noEncontrado } from "../utils/errors.js";
import { calcularDemanda, generarDemandaSimulada } from "../planificador/demanda.js";
import { periodoOferta } from "../planificador/repositorio.js";
import { limpiarCachePlanificador } from "./planificador.js";

export const adminRouter = Router();

// ---------------- Sesión ----------------

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  handler: (_q, _s, next) => next(new AppError(429, "DEMASIADOS_INTENTOS", "Demasiados intentos. Espera unos minutos.")),
});

adminRouter.post("/login", limiteLogin, (req, res) => {
  const usuario = String(req.body?.usuario ?? "").trim();
  const password = String(req.body?.password ?? "");
  if (!usuario || !password) throw new AppError(400, "CAMPOS_VACIOS", "Escribe usuario y contraseña.");
  if (!config.adminUsuario || !config.adminPassword) {
    throw new AppError(503, "ERROR_INTERNO", "El acceso de administrador no está configurado en el servidor.");
  }
  if (!iguales(usuario, config.adminUsuario) || !iguales(password, config.adminPassword)) {
    throw new AppError(401, "CREDENCIALES_INVALIDAS", "Usuario o contraseña de administrador incorrectos.");
  }
  res.json({ ok: true, expiraEn: crearSesionAdmin(res, usuario) });
});

adminRouter.post("/logout", (_req, res) => { cerrarSesionAdmin(res); res.json({ ok: true }); });

adminRouter.get("/sesion", (req, res) => {
  const s = leerSesionAdmin(req);
  res.json(s ? { autenticado: true, usuario: s.usuario, expiraEn: s.exp } : { autenticado: false });
});

// Todo lo de abajo requiere sesión de admin, y cualquier cambio invalida la caché del Planificador
adminRouter.use(requiereAdmin);
adminRouter.use((req, _res, next) => { if (req.method !== "GET") limpiarCachePlanificador(); next(); });

// ---------------- Validación ----------------

const texto = (v: unknown, campo: string, max = 200) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw invalido(`El campo "${campo}" es obligatorio.`);
  if (s.length > max) throw invalido(`El campo "${campo}" es demasiado largo.`);
  return s;
};
const textoOpcional = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const entero = (v: unknown, campo: string, minimo: number, maximo: number) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < minimo || n > maximo) throw invalido(`"${campo}" debe ser un entero entre ${minimo} y ${maximo}.`);
  return n;
};
const enteroOpcional = (v: unknown, campo: string, minimo: number, maximo: number) =>
  v === null || v === undefined || v === "" ? null : entero(v, campo, minimo, maximo);
const id = (v: unknown) => entero(v, "id", 1, 2_147_483_647);
const clave = (v: unknown) => {
  const s = texto(v, "clave", 30).toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(s)) throw invalido("La clave solo puede tener letras, números y guiones (ej. AED-1026).");
  return s;
};

const TIPOS = ["basica", "especialidad", "residencia", "servicio", "complementaria"] as const;
const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const;
const HORA = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const PERIODO = /^\d{2}\/(1|2|V)$/i;

// ---------------- Planes ----------------

adminRouter.get("/planes", async (_req, res) => {
  const d = await db();
  const planes = await d.query<{ id: number; clave: string; nombre: string; creditos_totales: number; materias: number }>(
    `SELECT p.*, (SELECT count(*)::int FROM materias m WHERE m.plan_id = p.id) AS materias FROM planes p ORDER BY p.id`,
  );
  const esps = await d.query<{ id: number; plan_id: number; clave: string; nombre: string; materias: number }>(
    `SELECT e.*, (SELECT count(*)::int FROM materias m WHERE m.especialidad_id = e.id) AS materias FROM especialidades e ORDER BY e.id`,
  );
  res.json(planes.map((p) => ({
    id: p.id, clave: p.clave, nombre: p.nombre, creditosTotales: p.creditos_totales, materias: p.materias,
    especialidades: esps.filter((e) => e.plan_id === p.id).map((e) => ({ id: e.id, clave: e.clave, nombre: e.nombre, materias: e.materias })),
  })));
});

const datosPlan = (b: Record<string, unknown>) => [clave(b.clave), texto(b.nombre, "nombre"), entero(b.creditosTotales, "creditosTotales", 1, 1000)];

adminRouter.post("/planes", async (req, res) => {
  const [fila] = await (await db()).query("INSERT INTO planes (clave, nombre, creditos_totales) VALUES ($1,$2,$3) RETURNING id", datosPlan(req.body ?? {}));
  res.status(201).json(fila);
});
adminRouter.put("/planes/:id", async (req, res) => {
  const filas = await (await db()).query("UPDATE planes SET clave=$1, nombre=$2, creditos_totales=$3 WHERE id=$4 RETURNING id", [...datosPlan(req.body ?? {}), id(req.params.id)]);
  if (!filas.length) throw noEncontrado("El plan");
  res.json(filas[0]);
});
adminRouter.delete("/planes/:id", async (req, res) => {
  const filas = await (await db()).query("DELETE FROM planes WHERE id=$1 RETURNING id", [id(req.params.id)]);
  if (!filas.length) throw noEncontrado("El plan");
  res.json({ ok: true });
});

// ---------------- Especialidades ----------------

adminRouter.get("/especialidades", async (_req, res) => {
  const filas = await (await db()).query<{ id: number; plan_id: number; clave: string; nombre: string }>("SELECT * FROM especialidades ORDER BY id");
  res.json(filas.map((e) => ({ id: e.id, planId: e.plan_id, clave: e.clave, nombre: e.nombre })));
});
adminRouter.post("/especialidades", async (req, res) => {
  const b = req.body ?? {};
  const [fila] = await (await db()).query("INSERT INTO especialidades (plan_id, clave, nombre) VALUES ($1,$2,$3) RETURNING id", [id(b.planId), clave(b.clave), texto(b.nombre, "nombre")]);
  res.status(201).json(fila);
});
adminRouter.put("/especialidades/:id", async (req, res) => {
  const b = req.body ?? {};
  const filas = await (await db()).query("UPDATE especialidades SET clave=$1, nombre=$2 WHERE id=$3 RETURNING id", [clave(b.clave), texto(b.nombre, "nombre"), id(req.params.id)]);
  if (!filas.length) throw noEncontrado("La especialidad");
  res.json(filas[0]);
});
adminRouter.delete("/especialidades/:id", async (req, res) => {
  const filas = await (await db()).query("DELETE FROM especialidades WHERE id=$1 RETURNING id", [id(req.params.id)]);
  if (!filas.length) throw noEncontrado("La especialidad");
  res.json({ ok: true });
});

// ---------------- Materias (con su seriación) ----------------

interface FilaMateria {
  id: number; plan_id: number; especialidad_id: number | null; clave: string; nombre: string; horas_teoria: number;
  horas_practica: number; creditos: number; semestre: number; tipo: string; porcentaje_requerido: number | null;
}

async function materiasConRequisitos(where: string, params: unknown[]) {
  const d = await db();
  const filas = await d.query<FilaMateria>(`SELECT * FROM materias ${where} ORDER BY semestre, clave`, params);
  if (!filas.length) return [];
  const reqs = await d.query<{ materia_id: number; requisito_id: number; clave: string; nombre: string; tipo: "pre" | "co" }>(
    `SELECT r.materia_id, r.requisito_id, m.clave, m.nombre, r.tipo FROM requisitos r JOIN materias m ON m.id = r.requisito_id
      WHERE r.materia_id = ANY($1::int[]) ORDER BY m.clave`, [filas.map((f) => f.id)],
  );
  return filas.map((f) => ({
    id: f.id, planId: f.plan_id, especialidadId: f.especialidad_id, clave: f.clave, nombre: f.nombre,
    horasTeoria: f.horas_teoria, horasPractica: f.horas_practica, creditos: f.creditos, semestre: f.semestre,
    tipo: f.tipo, porcentajeRequerido: f.porcentaje_requerido,
    requisitos: reqs.filter((r) => r.materia_id === f.id).map((r) => ({ id: r.requisito_id, clave: r.clave, nombre: r.nombre, tipo: r.tipo })),
  }));
}

/** GET /api/admin/materias[?planId=1][&especialidadId=2|comun] */
adminRouter.get("/materias", async (req, res) => {
  const cond: string[] = [], params: unknown[] = [];
  if (req.query.planId) { params.push(id(req.query.planId)); cond.push(`plan_id = $${params.length}`); }
  if (req.query.especialidadId === "comun") cond.push("especialidad_id IS NULL");
  else if (req.query.especialidadId) { params.push(id(req.query.especialidadId)); cond.push(`(especialidad_id IS NULL OR especialidad_id = $${params.length})`); }
  res.json(await materiasConRequisitos(cond.length ? `WHERE ${cond.join(" AND ")}` : "", params));
});

adminRouter.get("/materias/:id", async (req, res) => {
  const [m] = await materiasConRequisitos("WHERE id = $1", [id(req.params.id)]);
  if (!m) throw noEncontrado("La materia");
  res.json(m);
});

function datosMateria(b: Record<string, unknown>) {
  const tipo = String(b.tipo ?? "");
  if (!TIPOS.includes(tipo as never)) throw invalido(`"tipo" debe ser uno de: ${TIPOS.join(", ")}.`);
  const requisitos = Array.isArray(b.requisitos) ? b.requisitos : [];
  return {
    campos: [
      id(b.planId), b.especialidadId === null || b.especialidadId === undefined || b.especialidadId === "" ? null : id(b.especialidadId),
      clave(b.clave), texto(b.nombre, "nombre"),
      entero(b.horasTeoria ?? 0, "horasTeoria", 0, 20), entero(b.horasPractica ?? 0, "horasPractica", 0, 20),
      entero(b.creditos, "creditos", 0, 20), entero(b.semestre, "semestre", 1, 12), tipo,
      enteroOpcional(b.porcentajeRequerido, "porcentajeRequerido", 0, 100),
    ],
    requisitos: requisitos.map((r: { id?: unknown; tipo?: unknown }) => ({ id: id(r?.id), tipo: r?.tipo === "co" ? "co" : "pre" })),
  };
}

async function guardarRequisitos(tx: { query: (s: string, p?: unknown[]) => Promise<unknown[]> }, materiaId: number, requisitos: { id: number; tipo: string }[]) {
  await tx.query("DELETE FROM requisitos WHERE materia_id = $1", [materiaId]);
  for (const r of requisitos) {
    if (r.id === materiaId) throw invalido("Una materia no puede ser requisito de sí misma.");
    await tx.query("INSERT INTO requisitos (materia_id, requisito_id, tipo) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [materiaId, r.id, r.tipo]);
  }
}

adminRouter.post("/materias", async (req, res) => {
  const { campos, requisitos } = datosMateria(req.body ?? {});
  const nuevoId = await (await db()).transaccion(async (tx) => {
    const [fila] = await tx.query<{ id: number }>(
      `INSERT INTO materias (plan_id, especialidad_id, clave, nombre, horas_teoria, horas_practica, creditos, semestre, tipo, porcentaje_requerido)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, campos,
    );
    await guardarRequisitos(tx, fila.id, requisitos);
    return fila.id;
  });
  const [m] = await materiasConRequisitos("WHERE id = $1", [nuevoId]);
  res.status(201).json(m);
});

adminRouter.put("/materias/:id", async (req, res) => {
  const materiaId = id(req.params.id);
  const { campos, requisitos } = datosMateria(req.body ?? {});
  await (await db()).transaccion(async (tx) => {
    const filas = await tx.query(
      `UPDATE materias SET plan_id=$1, especialidad_id=$2, clave=$3, nombre=$4, horas_teoria=$5, horas_practica=$6,
              creditos=$7, semestre=$8, tipo=$9, porcentaje_requerido=$10 WHERE id=$11 RETURNING id`, [...campos, materiaId],
    );
    if (!filas.length) throw noEncontrado("La materia");
    await guardarRequisitos(tx, materiaId, requisitos);
  });
  const [m] = await materiasConRequisitos("WHERE id = $1", [materiaId]);
  res.json(m);
});

adminRouter.delete("/materias/:id", async (req, res) => {
  const filas = await (await db()).query("DELETE FROM materias WHERE id=$1 RETURNING id", [id(req.params.id)]);
  if (!filas.length) throw noEncontrado("La materia");
  res.json({ ok: true });
});

// ---------------- Oferta de grupos ----------------

async function gruposCon(where: string, params: unknown[]) {
  const d = await db();
  const grupos = await d.query<{ id: number; materia_id: number; clave: string; nombre: string; periodo: string; grupo: string; docente: string | null; cupo: number }>(
    `SELECT g.*, m.clave, m.nombre FROM grupos g JOIN materias m ON m.id = g.materia_id ${where} ORDER BY g.periodo, m.semestre, m.clave, g.grupo`, params,
  );
  if (!grupos.length) return [];
  const bloques = await d.query<{ grupo_id: number; dia: string; inicio: string; fin: string; salon: string | null }>(
    `SELECT * FROM bloques WHERE grupo_id = ANY($1::int[])
      ORDER BY array_position(ARRAY['lunes','martes','miercoles','jueves','viernes','sabado'], dia), inicio`, [grupos.map((g) => g.id)],
  );
  return grupos.map((g) => ({
    id: g.id, materiaId: g.materia_id, clave: g.clave, nombre: g.nombre, periodo: g.periodo, grupo: g.grupo, docente: g.docente, cupo: g.cupo,
    bloques: bloques.filter((b) => b.grupo_id === g.id).map(({ dia, inicio, fin, salon }) => ({ dia, inicio, fin, salon })),
  }));
}

/** GET /api/admin/oferta[?periodo=27/1][&materiaId=5] */
adminRouter.get("/oferta", async (req, res) => {
  const cond: string[] = [], params: unknown[] = [];
  if (typeof req.query.periodo === "string") { params.push(req.query.periodo); cond.push(`g.periodo = $${params.length}`); }
  if (req.query.materiaId) { params.push(id(req.query.materiaId)); cond.push(`g.materia_id = $${params.length}`); }
  res.json(await gruposCon(cond.length ? `WHERE ${cond.join(" AND ")}` : "", params));
});

adminRouter.get("/oferta/:id", async (req, res) => {
  const [g] = await gruposCon("WHERE g.id = $1", [id(req.params.id)]);
  if (!g) throw noEncontrado("El grupo");
  res.json(g);
});

function datosGrupo(b: Record<string, unknown>) {
  const periodo = texto(b.periodo, "periodo", 5).toUpperCase();
  if (!PERIODO.test(periodo)) throw invalido('El periodo debe tener el formato "27/1", "27/2" o "27/V".');
  const bloques = Array.isArray(b.bloques) ? b.bloques : [];
  if (!bloques.length) throw invalido("El grupo necesita al menos un bloque de horario.");
  const limpios = bloques.map((x: Record<string, unknown>, i: number) => {
    const dia = String(x?.dia ?? "");
    if (!DIAS.includes(dia as never)) throw invalido(`Bloque ${i + 1}: día inválido.`);
    const inicio = String(x?.inicio ?? ""), fin = String(x?.fin ?? "");
    if (!HORA.test(inicio) || !HORA.test(fin)) throw invalido(`Bloque ${i + 1}: usa horas en formato HH:MM.`);
    if (fin <= inicio) throw invalido(`Bloque ${i + 1}: la hora de fin debe ser posterior a la de inicio.`);
    return { dia, inicio, fin, salon: textoOpcional(x?.salon) };
  });
  // Un mismo grupo no puede tener dos bloques encimados
  for (let i = 0; i < limpios.length; i++) for (let j = i + 1; j < limpios.length; j++) {
    const a = limpios[i], c = limpios[j];
    if (a.dia === c.dia && a.inicio < c.fin && c.inicio < a.fin) throw invalido(`Los bloques ${i + 1} y ${j + 1} se enciman.`);
  }
  return {
    campos: [id(b.materiaId), periodo, texto(b.grupo, "grupo", 5).toUpperCase(), textoOpcional(b.docente), entero(b.cupo ?? 30, "cupo", 0, 500)],
    bloques: limpios,
  };
}

async function guardarBloques(tx: { query: (s: string, p?: unknown[]) => Promise<unknown[]> }, grupoId: number, bloques: { dia: string; inicio: string; fin: string; salon: string | null }[]) {
  await tx.query("DELETE FROM bloques WHERE grupo_id = $1", [grupoId]);
  for (const b of bloques) await tx.query("INSERT INTO bloques (grupo_id, dia, inicio, fin, salon) VALUES ($1,$2,$3,$4,$5)", [grupoId, b.dia, b.inicio, b.fin, b.salon]);
}

adminRouter.post("/oferta", async (req, res) => {
  const { campos, bloques } = datosGrupo(req.body ?? {});
  const nuevoId = await (await db()).transaccion(async (tx) => {
    const [g] = await tx.query<{ id: number }>("INSERT INTO grupos (materia_id, periodo, grupo, docente, cupo) VALUES ($1,$2,$3,$4,$5) RETURNING id", campos);
    await guardarBloques(tx, g.id, bloques);
    return g.id;
  });
  const [g] = await gruposCon("WHERE g.id = $1", [nuevoId]);
  res.status(201).json(g);
});

adminRouter.put("/oferta/:id", async (req, res) => {
  const grupoId = id(req.params.id);
  const { campos, bloques } = datosGrupo(req.body ?? {});
  await (await db()).transaccion(async (tx) => {
    const filas = await tx.query("UPDATE grupos SET materia_id=$1, periodo=$2, grupo=$3, docente=$4, cupo=$5 WHERE id=$6 RETURNING id", [...campos, grupoId]);
    if (!filas.length) throw noEncontrado("El grupo");
    await guardarBloques(tx, grupoId, bloques);
  });
  const [g] = await gruposCon("WHERE g.id = $1", [grupoId]);
  res.json(g);
});

adminRouter.delete("/oferta/:id", async (req, res) => {
  const filas = await (await db()).query("DELETE FROM grupos WHERE id=$1 RETURNING id", [id(req.params.id)]);
  if (!filas.length) throw noEncontrado("El grupo");
  res.json({ ok: true });
});

// ---------------- Demanda de grupos (para la coordinación) ----------------

const periodoDe = async (v: unknown) => {
  if (typeof v === "string" && v) {
    if (!PERIODO.test(v)) throw invalido('El periodo debe tener el formato "27/1".');
    return v.toUpperCase();
  }
  return periodoOferta();
};

/** GET /api/admin/demanda[?periodo=27/1][&simulados=false] → ocupación por grupo y recomendaciones por materia */
adminRouter.get("/demanda", async (req, res) => {
  res.json(await calcularDemanda(await periodoDe(req.query.periodo), req.query.simulados !== "false"));
});

/** POST /api/admin/demanda/simulados { alumnos?: 10–300 } → vuelve a generar los alumnos simulados */
adminRouter.post("/demanda/simulados", async (req, res) => {
  const periodo = await periodoDe(req.body?.periodo);
  if (!periodo) throw invalido("No hay oferta capturada.");
  const alumnos = req.body?.alumnos === undefined ? 150 : entero(req.body.alumnos, "alumnos", 10, 300);
  res.json({ ok: true, creados: await generarDemandaSimulada(periodo, alumnos) });
});

/** DELETE /api/admin/demanda/simulados → deja solo la demanda de alumnos reales */
adminRouter.delete("/demanda/simulados", async (req, res) => {
  const periodo = await periodoDe(req.query.periodo);
  if (periodo) await (await db()).query("DELETE FROM planes_alumno WHERE periodo = $1 AND simulado", [periodo]);
  res.json({ ok: true });
});
