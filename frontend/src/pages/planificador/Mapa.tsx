import { Pendiente } from "../../components/ui";

// TODO (Persona B) — ver CONTEXTO.md, sección 10.
export default function Pagina() {
  return (
    <Pendiente
      titulo="Planificador · Mapa de retícula"
      responsable="B"
      notas={["React Flow (@xyflow/react): columnas por semestre, colores por estado", "Aristas desde requisitos; panel lateral al hacer clic", "Datos: GET /api/planificador/avance"]}
    />
  );
}
