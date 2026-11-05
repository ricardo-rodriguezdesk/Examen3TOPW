// Fondo del login (alumno y admin) — Persona B.
/** Fondo tipo "fondo de pantalla" de iOS: manchas de color difuminadas. Es lo que le da vida al vidrio de encima. */
export default function FondoPantalla() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 bg-fondo">
      <div className="absolute -top-[20%] -left-[10%] size-[70vmax] rounded-full bg-[#5ac8fa] opacity-45 blur-[110px] dark:opacity-25" />
      <div className="absolute top-[20%] -right-[20%] size-[60vmax] rounded-full bg-[#5856d6] opacity-35 blur-[120px] dark:opacity-30" />
      <div className="absolute -bottom-[30%] left-[10%] size-[60vmax] rounded-full bg-[#007aff] opacity-35 blur-[120px] dark:opacity-30" />
    </div>
  );
}
