// Hooks del Planificador (alumno). Requieren sesión del SII.
//   const { data: avance } = useAvance();            // estado de cada materia, resumen y alertas
//   const { data: oferta } = useOferta();            // grupos del próximo periodo que SÍ puede cursar
//   const generar = useGenerarHorarios();            // generar.mutate({ claves, preferencias })
//   const { data: mio } = useMiHorario();            // horario guardado para el próximo periodo (o null)
//   const guardar = useGuardarMiHorario();           // guardar.mutate(opcion.grupos.map((g) => g.id))

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AvancePlan, MiHorario, Oferta, OpcionesHorario, Preferencias } from "../types/api";
import { api, del, post, put } from "./cliente";

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

// ---------- Mi horario (cuenta en la demanda que ve la coordinación) ----------

export const useMiHorario = () =>
  useQuery({ queryKey: ["planificador", "mi-horario"], queryFn: () => api<MiHorario>("/planificador/mi-horario") });

/** Recibe los ids de los grupos (uno por materia, sin choques). Reemplaza lo que hubiera guardado. */
export function useGuardarMiHorario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grupoIds: number[]) => put<MiHorario>("/planificador/mi-horario", { grupoIds }),
    onSuccess: (r) => { qc.setQueryData(["planificador", "mi-horario"], r); qc.invalidateQueries({ queryKey: ["admin", "demanda"] }); },
  });
}

export function useBorrarMiHorario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => del<MiHorario>("/planificador/mi-horario"),
    onSuccess: (r) => { qc.setQueryData(["planificador", "mi-horario"], r); qc.invalidateQueries({ queryKey: ["admin", "demanda"] }); },
  });
}
