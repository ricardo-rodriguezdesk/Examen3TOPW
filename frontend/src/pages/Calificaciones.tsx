import { Pendiente } from "../components/ui";

// TODO (Persona B) — ver CONTEXTO.md, sección 10.
export default function Pagina() {
  return (
    <Pendiente
      titulo="Calificaciones"
      responsable="B"
      notas={["Pestañas: Periodo actual (useCalificaciones) | Historial (useKardex)", "Filtro en tiempo real por materia/clave y select de periodo", "Colores con estiloDesempeno de lib/desempeno.ts y el componente <Calificacion>"]}
    />
  );
}
