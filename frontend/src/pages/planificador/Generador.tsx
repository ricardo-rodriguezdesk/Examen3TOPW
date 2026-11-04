import { Pendiente } from "../../components/ui";

// TODO (Persona B) — ver CONTEXTO.md, sección 10.
export default function Pagina() {
  return (
    <Pendiente
      titulo="Planificador · Generador de horarios"
      responsable="B"
      notas={["Checklist de materias disponibles + preferencias", "POST /api/planificador/generar", "Mostrar cada opción con HorarioGrid (de A)"]}
    />
  );
}
