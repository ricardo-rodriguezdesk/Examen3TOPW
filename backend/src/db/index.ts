// Capa de base de datos del Planificador.
//
// - Con DATABASE_URL (Neon en producción): usa PostgreSQL real vía `pg`.
// - Sin DATABASE_URL (desarrollo): usa PGlite, un PostgreSQL completo que corre dentro de Node.
//   No hay que instalar nada: los datos se guardan en backend/.pglite (o en memoria si PGLITE_DIR=memory).
//
// Al arrancar, crea las tablas si no existen y carga la retícula oficial si la BD está vacía.

import { config } from "../config.js";
import { ESQUEMA } from "./esquema.js";
import { completarEspecialidades, sembrar } from "./semilla.js";

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  /** Ejecuta varias consultas como una sola transacción. */
  transaccion<R>(fn: (tx: Pick<Db, "query">) => Promise<R>): Promise<R>;
}

async function crearPg(url: string): Promise<Db> {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, ssl: url.includes("localhost") ? false : { rejectUnauthorized: false }, max: 5 });
  return {
    query: async (sql, params) => (await pool.query(sql, params as unknown[])).rows,
    exec: async (sql) => { await pool.query(sql); },
    transaccion: async (fn) => {
      const cliente = await pool.connect();
      try {
        await cliente.query("BEGIN");
        const r = await fn({ query: async (sql, params) => (await cliente.query(sql, params as unknown[])).rows });
        await cliente.query("COMMIT");
        return r;
      } catch (e) {
        await cliente.query("ROLLBACK");
        throw e;
      } finally {
        cliente.release();
      }
    },
  };
}

async function crearPglite(dir: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = dir === "memory" ? new PGlite() : new PGlite(dir);
  return {
    query: async (sql, params) => (await db.query(sql, params as unknown[])).rows as never[],
    exec: async (sql) => { await db.exec(sql); },
    transaccion: (fn) => db.transaction((tx) => fn({ query: async (sql, params) => (await tx.query(sql, params as unknown[])).rows as never[] })),
  };
}

let instancia: Promise<Db> | null = null;

export function db(): Promise<Db> {
  if (!instancia) {
    instancia = (async () => {
      const d = config.databaseUrl ? await crearPg(config.databaseUrl) : await crearPglite(config.pgliteDir);
      await d.exec(ESQUEMA);
      const [{ n }] = await d.query<{ n: number }>("SELECT count(*)::int AS n FROM planes");
      if (n === 0) {
        await sembrar(d);
        console.log("BD: retícula oficial cargada");
      } else {
        // BD con datos (p. ej. Neon): agrega especialidades nuevas de la semilla sin tocar lo existente
        const agregadas = await completarEspecialidades(d);
        if (agregadas.length) console.log(`BD: especialidades agregadas: ${agregadas.join(", ")}`);
      }
      console.log(`BD lista (${config.databaseUrl ? "PostgreSQL" : "PGlite " + config.pgliteDir})`);
      return d;
    })();
    instancia.catch(() => { instancia = null; });
  }
  return instancia;
}
