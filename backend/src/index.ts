import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db/index.js";

// Prepara la BD al arrancar (crea tablas y carga la retícula si está vacía)
db().catch((e) => console.error("No se pudo preparar la BD:", e));

app.listen(config.port, () => {
  console.log(`Backend escuchando en http://localhost:${config.port}  (SII: ${config.siiMode})`);
});
