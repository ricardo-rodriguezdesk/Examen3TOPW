// Ícono de SII Planner: cuadro redondeado con degradado, como un ícono de app de iOS.
import clsx from "clsx";
import { GraduationCap } from "lucide-react";

/** Ícono de la app: cuadro redondeado con degradado, como un ícono de iOS. */
export default function IconoApp({ tam = "size-9" }: { tam?: string }) {
  return (
    <div className={clsx("grid shrink-0 place-items-center rounded-[28%] bg-gradient-to-b from-[#3d9bff] to-[#0063d1] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_2px_6px_rgb(0_80_200/0.35)]", tam)}>
      <GraduationCap className="size-[58%]" strokeWidth={2} />
    </div>
  );
}

