// CONTRATO del Planificador (lo que recibe el frontend). Ver CONTEXTO.md, sección 7.1.

import type { DiaSemana } from "../sii/tipos-app.js";

export type EstadoMateria = "aprobada" | "cursando" | "disponible" | "bloqueada" | "reprobada";
export type TipoMateria = "basica" | "especialidad" | "residencia" | "servicio" | "complementaria";

export interface MateriaAvance {
  clave: string;
  nombre: string;
  creditos: number;
  semestreSugerido: number;
  tipo: TipoMateria;
  requisitos: string[];            // pre-requisitos (claves)
  correquisitos: string[];         // co-requisitos: se cursan juntas
  porcentajeRequerido: number | null; // % de créditos del plan necesario para cursarla
  estado: EstadoMateria;
  calificacion: number | null;     // la acreditada (null si no hay o si fue "AC")
  intentos: number;                // veces cursada según el kardex
  requisitosPendientes: string[];  // pre-requisitos aún no acreditados
  faltaPorcentaje: boolean;        // true si la bloquea el % de créditos
}

export interface Alerta {
  nivel: "info" | "advertencia" | "critica";
  mensaje: string;
  clave?: string;
}

export interface AvancePlan {
  plan: { id: number; clave: string; nombre: string; creditosTotales: number };
  especialidad: { id: number; clave: string; nombre: string; detectada: boolean } | null;
  especialidades: { clave: string; nombre: string }[]; // para que el alumno pueda cambiarla
  materias: MateriaAvance[];
  resumen: {
    creditosAprobados: number;
    creditosCursando: number;
    creditosTotales: number;
    porcentaje: number;
    semestresCursados: number;
    semestresRestantesEstimados: number;
    egresoEstimado: string; // "Ago–Dic 2027"
  };
  alertas: Alerta[];
}

export interface BloqueOferta { dia: DiaSemana; inicio: string; fin: string; salon: string | null }

export interface GrupoOferta {
  id: number;
  clave: string;
  nombre: string;
  creditos: number;
  grupo: string;
  docente: string | null;
  cupo: number;
  bloques: BloqueOferta[];
}

export interface Oferta {
  periodo: string;        // "27/1"
  periodoTexto: string;   // "Ene–Jun 2027"
  grupos: GrupoOferta[];  // solo de materias que el alumno PUEDE cursar
}

export interface Preferencias {
  turno?: "matutino" | "vespertino";
  evitarSabado?: boolean;
  maxCreditos?: number;
}

export interface OpcionHorario {
  grupos: GrupoOferta[];
  creditos: number;
  horasHueco: number;
  diasConClase: number;
  horaEntrada: string; // la más temprana de la semana
  horaSalida: string;  // la más tarde de la semana
  puntuacion: number;  // 0–100, mayor es mejor
}

export interface OpcionesHorario {
  opciones: OpcionHorario[];       // máximo 10, ordenadas por puntuación
  sinSolucion: string[];           // claves sin ningún grupo compatible con las preferencias
  advertencias: string[];          // p. ej. co-requisitos que conviene agregar
}
