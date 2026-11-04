import { Pendiente } from "../../components/ui";

// TODO (Persona B) — ver CONTEXTO.md, sección 10.
export default function Pagina() {
  return (
    <Pendiente
      titulo="Planificador · Avance"
      responsable="B"
      notas={["Resumen de créditos, egreso estimado y alertas", "Contrato: GET /api/planificador/avance (CONTEXTO.md 7.1)", "Mientras no exista, usa src/mocks/planificador.ts"]}
    />
  );
}
