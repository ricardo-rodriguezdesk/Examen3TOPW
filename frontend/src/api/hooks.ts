// Hooks de datos (TanStack Query). Las páginas SOLO usan estos hooks, nunca fetch directo.
//   const { data, isPending, error, refetch } = useKardex();

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CalificacionesActuales, Estudiante, Horario, Kardex, Sesion } from "../types/api";
import { api, post } from "./cliente";

const CINCO_MIN = 5 * 60 * 1000;

export const claves = {
  sesion: ["sesion"] as const,
  estudiante: ["estudiante"] as const,
  calificaciones: ["calificaciones"] as const,
  kardex: ["kardex"] as const,
  horario: ["horario"] as const,
};

// ---------- Sesión ----------

export const useSesion = () =>
  useQuery({ queryKey: claves.sesion, queryFn: () => api<Sesion>("/auth/sesion"), staleTime: 60_000 });

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: { usuario: string; password: string }) => post<{ ok: true; expiraEn: number }>("/auth/login", datos),
    onSuccess: (r) => {
      qc.clear(); // por si había datos de otra cuenta
      qc.setQueryData<Sesion>(claves.sesion, { autenticado: true, expiraEn: r.expiraEn });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<{ ok: true }>("/auth/logout"),
    onSettled: () => {
      qc.clear();
      qc.setQueryData<Sesion>(claves.sesion, { autenticado: false });
    },
  });
}

// ---------- Datos académicos ----------

export const useEstudiante = () =>
  useQuery({ queryKey: claves.estudiante, queryFn: () => api<Estudiante>("/estudiante"), staleTime: CINCO_MIN });

export const useCalificaciones = () =>
  useQuery({ queryKey: claves.calificaciones, queryFn: () => api<CalificacionesActuales>("/calificaciones"), staleTime: CINCO_MIN });

export const useKardex = () =>
  useQuery({ queryKey: claves.kardex, queryFn: () => api<Kardex>("/kardex"), staleTime: CINCO_MIN });

export const useHorario = () =>
  useQuery({ queryKey: claves.horario, queryFn: () => api<Horario>("/horario"), staleTime: CINCO_MIN });
