import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db/index.js";
import { sembrarDemandaSiFalta } from "./planificador/demanda.js";
import { periodoOferta } from "./planificador/repositorio.js";

// Prepara la BD al arrancar (crea tablas y carga la retícula si está vacía) y,
// si falta, genera la demanda simulada del periodo de oferta (para la pantalla de la coordinación).
db()
  .then(async (d) => sembrarDemandaSiFalta(d, await periodoOferta()))
  .catch((e) => console.error("No se pudo preparar la BD:", e));

app.listen(config.port, () => {
  console.log(`Backend escuchando en http://localhost:${config.port}  (SII: ${config.siiMode})`);
});
