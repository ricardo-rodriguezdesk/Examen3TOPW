import { Pendiente } from "../components/ui";

// TODO (Persona B) — ver CONTEXTO.md, sección 10.
export default function Pagina() {
  return (
    <Pendiente
      titulo="Kardex"
      responsable="B"
      notas={["Tarjetas resumen + gráfica de promedio por semestre (Recharts)", "Secciones por semestre que se abren y cierran, con su tabla", "Badges de tipo: Ordinario / Repetición / Especial"]}
    />
  );
}
