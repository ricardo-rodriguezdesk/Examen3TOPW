import { Pendiente } from "../../components/ui";

// TODO (Persona B) — ver CONTEXTO.md, sección 10.
export default function Pagina() {
  return (
    <Pendiente
      titulo="Administración · Materias"
      responsable="B"
      notas={["CRUD de materias de la retícula con selector de requisitos", "Rutas /api/admin/materias", "Sesión de admin aparte (no usa credenciales del SII)"]}
    />
  );
}
