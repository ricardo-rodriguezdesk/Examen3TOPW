// Hooks del Planificador (alumno). Requieren sesión del SII.
//   const { data: avance } = useAvance();            // estado de cada materia, resumen y alertas
//   const { data: oferta } = useOferta();            // grupos del próximo periodo que SÍ puede cursar
//   const generar = useGenerarHorarios();            // generar.mutate({ claves, preferencias })

import { useMutation, useQuery } from "@tanstack/react-query";
import type { AvancePlan, Oferta, OpcionesHorario, Preferencias } from "../types/api";
import { api, post } from "./cliente";

const qs = (especialidad?: string) => (especialidad ? `?especialidad=${encodeURIComponent(especialidad)}` : "");

/** `especialidad` es opcional: si no se manda, el backend la detecta con el kardex. */
export const useAvance = (especialidad?: string) =>
  useQuery({ queryKey: ["planificador", "avance", especialidad ?? ""], queryFn: () => api<AvancePlan>(`/planificador/avance${qs(especialidad)}`), staleTime: 60_000 });

export const useOferta = (especialidad?: string) =>
  useQuery({ queryKey: ["planificador", "oferta", especialidad ?? ""], queryFn: () => api<Oferta>(`/planificador/oferta${qs(especialidad)}`), staleTime: 60_000 });

export const useGenerarHorarios = (especialidad?: string) =>
  useMutation({
    mutationFn: (datos: { claves: string[]; preferencias?: Preferencias }) =>
      post<OpcionesHorario>(`/planificador/generar${qs(especialidad)}`, datos),
  });
