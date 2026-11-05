// Hooks del panel de ADMINISTRACIÓN (sesión propia, NO usa el SII).
//   Desarrollo: usuario "admin", contraseña "admin123".
//
//   const { data: sesion } = useSesionAdmin();     // { autenticado, usuario }
//   const { data: materias } = useMateriasAdmin({ especialidadId: 1 });
//   const guardar = useGuardarMateria();           // guardar.mutate({ id?, datos })
//   const borrar  = useEliminarMateria();          // borrar.mutate(id)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  GrupoAdmin, GrupoAdminEntrada, MateriaAdmin, MateriaAdminEntrada, PlanAdmin, SesionAdmin,
} from "../types/api";
import { api, del, post, put } from "./cliente";

const K = {
  sesion: ["admin", "sesion"] as const,
  planes: ["admin", "planes"] as const,
  materias: ["admin", "materias"] as const,
  oferta: ["admin", "oferta"] as const,
};

// ---------- Sesión ----------

export const useSesionAdmin = () => useQuery({ queryKey: K.sesion, queryFn: () => api<SesionAdmin>("/admin/sesion") });

export function useLoginAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { usuario: string; password: string }) => post<{ ok: true; expiraEn: number }>("/admin/login", d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useLogoutAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<{ ok: true }>("/admin/logout"),
    onSettled: () => { qc.removeQueries({ queryKey: ["admin"] }); qc.setQueryData<SesionAdmin>(K.sesion, { autenticado: false }); },
  });
}

// ---------- Planes ----------

export const usePlanesAdmin = () => useQuery({ queryKey: K.planes, queryFn: () => api<PlanAdmin[]>("/admin/planes") });

// ---------- Materias ----------

/** especialidadId: número → tronco común + esa especialidad · "comun" → solo tronco común · omitido → todas */
export const useMateriasAdmin = (f: { planId?: number; especialidadId?: number | "comun" } = {}) => {
  const p = new URLSearchParams();
  if (f.planId) p.set("planId", String(f.planId));
  if (f.especialidadId) p.set("especialidadId", String(f.especialidadId));
  return useQuery({ queryKey: [...K.materias, f], queryFn: () => api<MateriaAdmin[]>(`/admin/materias?${p}`) });
};

export function useGuardarMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id?: number; datos: MateriaAdminEntrada }) =>
      id ? put<MateriaAdmin>(`/admin/materias/${id}`, datos) : post<MateriaAdmin>("/admin/materias", datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["planificador"] }); },
  });
}

export function useEliminarMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => del<{ ok: true }>(`/admin/materias/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["planificador"] }); },
  });
}

// ---------- Oferta de grupos ----------

export const useOfertaAdmin = (periodo?: string) =>
  useQuery({ queryKey: [...K.oferta, periodo ?? ""], queryFn: () => api<GrupoAdmin[]>(`/admin/oferta${periodo ? `?periodo=${encodeURIComponent(periodo)}` : ""}`) });

export function useGuardarGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id?: number; datos: GrupoAdminEntrada }) =>
      id ? put<GrupoAdmin>(`/admin/oferta/${id}`, datos) : post<GrupoAdmin>("/admin/oferta", datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.oferta }); qc.invalidateQueries({ queryKey: ["planificador"] }); },
  });
}

export function useEliminarGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => del<{ ok: true }>(`/admin/oferta/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.oferta }); qc.invalidateQueries({ queryKey: ["planificador"] }); },
  });
}

// ---------- Planes y especialidades (agregado por B para la pantalla Planes) ----------

export interface PlanAdminEntrada { clave: string; nombre: string; creditosTotales: number }
export interface EspecialidadAdminEntrada { planId: number; clave: string; nombre: string }

const alCambiarReticula = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["admin"] });
  qc.invalidateQueries({ queryKey: ["planificador"] });
};

export function useGuardarPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id?: number; datos: PlanAdminEntrada }) =>
      id ? put<{ id: number }>(`/admin/planes/${id}`, datos) : post<{ id: number }>("/admin/planes", datos),
    onSuccess: () => alCambiarReticula(qc),
  });
}

export function useEliminarPlan() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => del<{ ok: true }>(`/admin/planes/${id}`), onSuccess: () => alCambiarReticula(qc) });
}

export function useGuardarEspecialidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id?: number; datos: EspecialidadAdminEntrada }) =>
      id ? put<{ id: number }>(`/admin/especialidades/${id}`, datos) : post<{ id: number }>("/admin/especialidades", datos),
    onSuccess: () => alCambiarReticula(qc),
  });
}

export function useEliminarEspecialidad() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => del<{ ok: true }>(`/admin/especialidades/${id}`), onSuccess: () => alCambiarReticula(qc) });
}
