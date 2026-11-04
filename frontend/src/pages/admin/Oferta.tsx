import { Pendiente } from "../../components/ui";

// TODO (Persona B) — ver CONTEXTO.md, sección 10.
export default function Pagina() {
  return (
    <Pendiente
      titulo="Administración · Oferta de grupos"
      responsable="B"
      notas={["CRUD de grupos con editor de bloques por día", "Rutas /api/admin/oferta"]}
    />
  );
}
