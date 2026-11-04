import { Pendiente } from "../../components/ui";

// TODO (Persona B) — ver CONTEXTO.md, sección 10.
export default function Pagina() {
  return (
    <Pendiente
      titulo="Administración · Acceso"
      responsable="B"
      notas={["Formulario usuario/contraseña de admin", "POST /api/admin/login"]}
    />
  );
}
