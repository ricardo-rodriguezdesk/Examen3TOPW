import { Pendiente } from "../components/ui";

// TODO (Persona A) — ver CONTEXTO.md, sección 11.
export default function Pagina() {
  return (
    <Pendiente
      titulo="Horario"
      responsable="A"
      notas={["useHorario(): cuadrícula días × horas con el componente HorarioGrid", "Vista por día en móvil", "HorarioGrid se reutiliza en el Generador del Planificador"]}
    />
  );
}
