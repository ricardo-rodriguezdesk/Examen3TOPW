import { Pendiente } from "../components/ui";

// TODO (Persona A) — ver CONTEXTO.md, sección 11.
export default function Pagina() {
  return (
    <Pendiente
      titulo="Inicio"
      responsable="A"
      notas={["useEstudiante(): tarjetas de promedio, créditos, % de avance y semestre", "Resumen de hoy: clases del día con useHorario()", "Skeleton mientras carga, ErrorState si falla"]}
    />
  );
}
