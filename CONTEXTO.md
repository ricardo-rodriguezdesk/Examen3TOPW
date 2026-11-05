# CONTEXTO DEL PROYECTO — SII Planner (Examen 3)

> **Para Claude:** este documento es la fuente de verdad del proyecto. Léelo completo antes de escribir código.
> Estás ayudando a **la Persona B**. La Persona A trabaja en paralelo con otro chat de Claude, usando este
> mismo documento. Respeta los contratos de la sección 6 y la sección 8: si algo necesita cambiar, avísale a tu usuario
> para que lo acuerde con A y actualicen este archivo **antes** de cambiar el código.
> Ambos integrantes usan **macOS** (MacBook).

Última actualización: 4 nov 2026 — por A

---

## 1. Qué es el proyecto

Examen 3 de la materia: una **aplicación web** que consume la API REST del **SII del TecNM Celaya** para que el
alumno inicie sesión y vea su información académica, más una **funcionalidad original con backend propio**.

**Requisitos del examen (resumen):**

1. **Autenticación**: login con correo y contraseña contra `POST /api/login`, token guardado de forma segura,
   manejo de errores (credenciales incorrectas, servidor caído, campos vacíos), rutas privadas protegidas.
2. **Información del estudiante**: dashboard con tarjetas o gráficas, indicador de carga (skeleton), mensajes de error.
3. **Calificaciones**: tabla o tarjetas con materia, periodo y calificación; **filtro en tiempo real** por materia o
   periodo; **colores verde/amarillo/rojo** según el desempeño.
4. **Kardex y Horario**: rutas independientes; kardex completo y estructurado; horario en cuadrícula días × horas.
5. **Funcionalidad adicional** con **su propio backend de administración** (los datos pueden ser simulados) y
   una propuesta escrita que justifique su utilidad.

**Reglas importantes:** los puntos 1–4 deben usar la **API real** (no simulada). Se evalúan la calidad visual,
la creatividad y la justificación de la tecnología. Entregables: repositorio de GitHub, README con instalación,
tecnología y capturas, y despliegue público. La exposición incluye una demo en vivo y **ambos deben participar**.
Copiar de otros equipos anula el examen.

**Nuestra funcionalidad adicional: el _Planificador de trayectoria académica_** (detalle en la sección 7).

---

## 2. Decisiones ya tomadas (no reabrir sin acordarlo)

| Tema | Decisión | Por qué |
|---|---|---|
| Frontend | **React + Vite + TypeScript** | SPA rápida, HMR, fácil de justificar |
| Backend | **Node + Express 5 + TypeScript** | simple, los dos lo entienden |
| Base de datos (Planificador) | **PostgreSQL en Neon** con **Prisma** | gratis, una sola URL de conexión |
| Despliegue | Front en **Vercel**, back en **Render**, BD en **Neon** | arquitectura de 2 capas visible |
| Comunicación front→back | Rewrite de Vercel `/api/*` → Render | mismo dominio: sin CORS y la cookie funciona en Safari |
| Sesión | Token del SII en **cookie httpOnly** puesta por el backend | el JS del navegador nunca ve el token |
| Estilos | **Tailwind CSS** | rápido y consistente |
| Peticiones en el front | **TanStack Query** | caché, loading y error gratis |
| Gráficas | **Recharts** | sencillo con React |
| Íconos | **lucide-react** | |
| Mapa de seriación | **React Flow** (`@xyflow/react`) | grafos interactivos |

---

## 3. Arquitectura

```
Navegador ──► Vercel (React)  ──/api/* rewrite──►  Render (Express)  ──►  API SII ITC
                                                          │
                                                          └──►  Neon (Postgres)
                                                                (solo Planificador)
```

- La API del SII es la **única fuente de verdad** de la autenticación y los datos académicos.
- Nuestro backend es el **intermediario seguro** y el dueño de la lógica del Planificador.
- El frontend **solo** llama a nuestro backend (`/api/...`), **nunca** al SII directamente.

---

## 4. Lo que sabemos de la API del SII (probado con datos reales)

Base: `https://sii.celaya.tecnm.mx/api`

- **Formato del correo:** `l<numeroControl>@celaya.tecnm.mx` con **L minúscula**. Con mayúscula o con otro dominio falla.
  El backend lo arma solo: el alumno puede escribir `21031301`, `L21031301` o el correo completo.
- **El login responde HTTP 200 siempre**, incluso si falla. Si sale bien, trae
  `{ status: 200, flag: "success", message: { login: { token } } }`; si falla, `{ status: 401, flag: null, message: null }`.
- El token es un **JWT que dura 60 minutos** (`exp`).
- Los endpoints protegidos **sí** responden con HTTP 401 real: `{"error":"Token not provided"}` o `{"error":"Token is invalid or expired"}`.
- Muchos números vienen como **texto** (`"83.83"`), y hay errores de escritura en el SII (`calificaiones`, `percentaje_avance_cursando`).
- **Calificaciones**: solo el **periodo actual**, con calificaciones **por unidad** (hasta 4; las faltantes en `null`), **sin calificación final**.
- **Kardex**: cada intento es un registro (ordinario, repetición, curso especial). `"0"` = no acreditada, `"AC"` = acreditada sin número.
  Periodos con formato `21/2` (Ago–Dic), `22/1` (Ene–Jun), `23/V` (verano).
- **Horario**: una fila por materia, cada día es un texto `"15:00-17:00"` más el salón (`lunes_clave_salon`).

**Todo esto ya lo resuelve el backend.** El frontend recibe datos limpios (sección 6).

---

## 5. Estado actual

| Pieza | Responsable | Estado |
|---|---|---|
| Pruebas a la API del SII | A | ✅ Hecho |
| Backend SII: login, logout, sesión, cookie, middleware | A | ✅ Hecho y probado |
| Backend: `/api/estudiante`, `/calificaciones`, `/kardex`, `/horario` normalizados | A | ✅ Hecho y probado |
| Backend: **modo mock** con alumna ficticia | A | ✅ Hecho |
| Esqueleto del frontend (Vite, router, Tailwind, cliente API, hooks, layout) | A | ⏳ Siguiente tarea de A |
| Login, rutas protegidas, layout y navegación, dashboard, horario (front) | A | ⏳ Pendiente |
| **Calificaciones (front)** | **B** | ⏳ Pendiente |
| **Kardex (front)** | **B** | ⏳ Pendiente |
| Planificador — backend (BD, retícula, lógica, generador, admin API) | A | ⏳ Pendiente |
| **Planificador — frontend (mapa, avance, generador, panel admin)** | **B** | ⏳ Pendiente |
| Despliegue (Render, Vercel, Neon) | A | ⏳ Pendiente |
| **README, capturas, propuesta escrita del Planificador** | **B** | ⏳ Pendiente |
| Retícula de ISC con seriación (PDF de la coordinación) | Los dos | ⏳ Conseguirla |

> Cuando terminen algo, **actualicen esta tabla** en el mismo commit.

---

## 6. Contrato del backend (lo que el frontend recibe)

Todas las rutas van bajo `/api`. La cookie viaja sola: en `fetch` usar **`credentials: "include"`**.

### Errores (todas las rutas)

```ts
// HTTP 4xx/5xx con este cuerpo:
{ error: CodigoError; mensaje: string } // `mensaje` ya viene listo para mostrarse al usuario
type CodigoError =
  | "CAMPOS_VACIOS" | "CREDENCIALES_INVALIDAS" | "SESION_REQUERIDA" | "SESION_EXPIRADA"
  | "SII_NO_DISPONIBLE" | "SII_RESPUESTA_INVALIDA" | "DEMASIADOS_INTENTOS" | "NO_ENCONTRADO" | "ERROR_INTERNO";
```

Si llega `SESION_REQUERIDA` o `SESION_EXPIRADA`, el frontend manda al login. Esto lo resuelve A en el cliente API, así que B no tiene que manejarlo.

### Autenticación

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/api/auth/login` | `{ usuario, password }` | `{ ok: true, expiraEn: number }` (ms epoch) |
| POST | `/api/auth/logout` | — | `{ ok: true }` |
| GET | `/api/auth/sesion` | — | `{ autenticado: boolean, expiraEn?: number }` |

### Datos académicos (requieren sesión)

```ts
interface Periodo { clave: string; anio: number; descripcion: string } // "26/2", 2026, "Agosto - Diciembre 2026"

type Desempeno = "alto" | "medio" | "bajo" | "sin_datos";
// alto ≥ 90 → verde · medio 70–89 → amarillo · bajo < 70 → rojo · sin_datos → gris

// GET /api/estudiante
interface Estudiante {
  numeroControl: string; nombre: string; email: string; semestre: number;
  foto: string | null; // ya lista para <img src>
  promedioPonderado: number; promedioAritmetico: number;
  creditosAcumulados: number; creditosComplementarios: number;
  porcentajeAvance: number; porcentajeAvanceCursando: number;
  materiasCursadas: number; materiasAprobadas: number; materiasReprobadas: number;
  materiasNoAcreditadasPendientes: number; materiasEnRepeticion: number; materiasEnEspecial: number;
}

// GET /api/calificaciones   (solo periodo actual)
interface CalificacionesActuales {
  periodo: Periodo | null;
  materias: {
    idGrupo: number; clave: string; nombre: string; grupo: string;
    unidades: { numero: number; calificacion: number | null }[];
    unidadesCapturadas: number;
    promedioActual: number | null; // promedio de las unidades capturadas
    desempeno: Desempeno;
  }[];
}

// GET /api/kardex
type TipoCurso = "ordinario" | "repeticion" | "especial" | "otro";
interface MateriaKardex {
  clave: string; nombre: string;
  periodo: string; periodoTexto: string; // "21/2", "Ago–Dic 2021"
  creditos: number;
  calificacion: number | null; // null si es "AC"
  textoCalificacion: string;    // "84" | "AC" | "NA"
  acreditada: boolean;
  tipo: TipoCurso; tipoTexto: string; // "REPETICIÓN"…
  semestre: number;
  desempeno: Desempeno;
}
interface Kardex {
  porcentajeAvance: number;
  totalCreditosAcreditados: number;
  promedioGeneral: number | null;
  materias: MateriaKardex[];                       // ordenadas por semestre y periodo
  semestres: { semestre: number; materias: MateriaKardex[]; creditosAcreditados: number; promedio: number | null }[];
  periodos: { clave: string; texto: string }[];    // listos para un <select> de filtro
}

// GET /api/horario
type DiaSemana = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado";
interface Horario {
  periodo: Periodo | null;
  materias: { idGrupo: number; clave: string; nombre: string; grupo: string; colorIndice: number; horasSemana: number }[];
  bloques: {
    dia: DiaSemana; diaIndice: number; inicio: string; fin: string;
    inicioMin: number; finMin: number; // minutos desde 00:00
    idGrupo: number; clave: string; nombre: string; grupo: string; salon: string | null; colorIndice: number;
  }[];
  dias: DiaSemana[];  // columnas a mostrar
  horaInicio: number; // primera fila (ej. 7)
  horaFin: number;    // última fila (ej. 15)
}
```

La fuente oficial de estos tipos es `backend/src/sii/tipos-app.ts`. En el frontend vivirán copiados en
`frontend/src/types/api.ts`. **Si cambian, se cambian en los dos lados en el mismo commit.**

---

## 7. El Planificador de trayectoria académica

**Problema:** el alumno no sabe con claridad qué le falta para egresar, qué materias tiene bloqueadas por
seriación ni qué combinación de grupos le conviene el próximo semestre.

**Qué hace:**
1. **Mapa de retícula**: todas las materias del plan, en columnas por semestre, con flechas de seriación.
   Colores por estado: aprobada (verde), cursando (azul), disponible (blanco), bloqueada (gris), reprobada pendiente (rojo).
2. **Avance**: créditos aprobados contra el total, % de avance, semestres restantes estimados y fecha estimada de egreso.
3. **Alertas**: materias en repetición o curso especial, y semestres cursados frente al límite reglamentario.
4. **Generador de horarios**: el alumno elige materias **disponibles** y preferencias (turno, evitar sábado,
   máximo de créditos), y el sistema propone combinaciones de grupos **sin choques**, ordenadas por puntuación (menos huecos, etc.).
5. **Panel de administración** (backend propio, requisito del examen): CRUD de planes, materias de la retícula
   con su seriación, y la oferta de grupos del próximo periodo (datos simulados).

**De dónde salen los datos:** el estado de cada materia se calcula cruzando el **kardex real** (SII) con la
**retícula** (nuestra BD), usando la **clave de la materia** (ej. `AED-1026`). La retícula y la oferta las captura el
administrador; pueden ser simuladas, porque el examen lo permite.

### 7.1 Contrato del Planificador (BORRADOR — A lo implementa, B lo consume)

```ts
type EstadoMateria = "aprobada" | "cursando" | "disponible" | "bloqueada" | "reprobada";

// GET /api/planificador/avance   (requiere sesión de alumno)
interface AvancePlan {
  plan: { id: number; clave: string; nombre: string; creditosTotales: number };
  materias: {
    clave: string; nombre: string; creditos: number; semestreSugerido: number;
    tipo: "basica" | "especialidad" | "residencia" | "servicio" | "complementaria";
    requisitos: string[];            // claves de las materias previas (seriación)
    estado: EstadoMateria;
    calificacion: number | null;     // la acreditada, si existe
    intentos: number;                // veces cursada según el kardex
    requisitosPendientes: string[];  // las que la bloquean
  }[];
  resumen: {
    creditosAprobados: number; creditosTotales: number; porcentaje: number;
    semestresCursados: number; semestresRestantesEstimados: number; egresoEstimado: string; // "Ago–Dic 2027"
  };
  alertas: { nivel: "info" | "advertencia" | "critica"; mensaje: string; clave?: string }[];
}

// GET /api/planificador/oferta   → grupos ofertados de las materias DISPONIBLES del alumno
interface GrupoOferta {
  id: number; clave: string; nombre: string; grupo: string; docente: string | null; cupo: number;
  bloques: { dia: DiaSemana; inicio: string; fin: string; salon: string | null }[];
}

// POST /api/planificador/generar
// cuerpo: { claves: string[]; preferencias?: { turno?: "matutino" | "vespertino"; evitarSabado?: boolean; maxCreditos?: number } }
interface OpcionesHorario {
  opciones: {
    grupos: GrupoOferta[]; creditos: number;
    horasHueco: number; horaEntrada: string; horaSalida: string; puntuacion: number;
  }[];
  sinSolucion: string[]; // claves que no tienen ningún grupo compatible
}

// ---- Administración (sesión de admin aparte: usuario y contraseña propios, NO los del SII) ----
// POST /api/admin/login { usuario, password }  ·  POST /api/admin/logout  ·  GET /api/admin/sesion
// CRUD: /api/admin/planes  ·  /api/admin/materias (incluye requisitos)  ·  /api/admin/oferta (incluye bloques)
//   GET lista · GET /:id · POST crea · PUT /:id actualiza · DELETE /:id
```

> Es un **borrador**. Mientras A no tenga listas estas rutas, B trabaja con **datos de ejemplo locales** que tengan
> exactamente estas formas (por ejemplo, `frontend/src/mocks/planificador.ts`). Cuando A las publique, solo se cambia la fuente de los datos.

---

## 8. Estructura del repositorio y reglas de colaboración

```
sii-planner/
├── CONTEXTO.md          ← este documento
├── README.md            ← entregable (B)
├── backend/             ← Express + TS (A)
│   └── src/
│       ├── sii/          cliente SII, tipos, normalizadores, mock
│       ├── routes/       auth, academico  (+ planificador, admin: A)
│       └── middleware/
└── frontend/            ← React + Vite + TS
    └── src/
        ├── api/          cliente fetch + hooks de TanStack Query  (A)
        ├── types/api.ts  copia del contrato (sección 6)
        ├── components/   ui/ compartidos (Card, Skeleton, Badge, ErrorState…) + HorarioGrid (A)
        ├── layouts/      AppLayout con navegación (A)
        ├── pages/
        │   ├── Login.tsx, Dashboard.tsx, Horario.tsx               (A)
        │   ├── Calificaciones.tsx, Kardex.tsx                      (B)
        │   ├── planificador/  Mapa, Avance, Generador              (B)
        │   └── admin/         Login, Materias, Oferta, Planes      (B)
        └── mocks/        datos de ejemplo del Planificador (B)
```

**Reglas:**
- **Ramas**: `main` siempre funciona. Cada quien trabaja en su rama (`b/calificaciones`, `a/dashboard`…) y
  une con **Pull Request**; el otro le da un vistazo rápido antes del merge.
- **Antes de empezar el día**: `git pull origin main` y unir `main` a tu rama.
- **No editar archivos del otro** sin avisar. Si B necesita algo en `api/`, `components/ui/` o en el backend, se lo pide a A, o lo hace y lo avisa en el PR.
- **Commits en español**, cortos y en imperativo: `Agrega filtro por periodo en calificaciones`.
- **Nunca subir** `.env`, tokens ni datos personales reales. Los datos de ejemplo siempre son **ficticios**.
- Si cambia una decisión o un contrato, **primero se actualiza este archivo**.

---

## 9. Configurar la Mac (B, una sola vez)

```bash
# 1. Herramientas (si no las tienes)
xcode-select --install                    # incluye git
# Node 20 o superior: descárgalo de https://nodejs.org (LTS) y verifica:
node -v && npm -v

# 2. Clonar el repositorio (A te agrega como colaborador en GitHub)
git clone https://github.com/<usuario-de-A>/sii-planner.git
cd sii-planner

# 3. Backend en modo mock (no necesitas credenciales del SII)
cd backend
npm install
cp .env.example .env
# en .env cambia:  SII_MODE=mock
npm run dev                               # → http://localhost:4000/api/salud

# 4. Frontend (cuando A suba el esqueleto), en otra pestaña de la terminal
cd ../frontend
npm install
npm run dev                               # → http://localhost:5173
```

**Login en modo mock:** usuario `99030001` · contraseña `demo123` (alumna ficticia de ISC, 7.º semestre).
Para probar con datos reales, cada quien pone `SII_MODE=real` en **su propio** `.env` y usa **sus propias** credenciales.

Editor recomendado: VS Code con las extensiones *ESLint*, *Prettier* y *Tailwind CSS IntelliSense*.

---

## 10. Tareas de B, paso a paso

### Mientras A sube el esqueleto del frontend
1. Clonar, levantar el backend en modo mock y probar las rutas en el navegador
   (después de hacer login, `GET /api/kardex` muestra el JSON).
2. Leer `backend/src/sii/normalizar.ts` y `tipos-app.ts` para entender los datos.
3. Empezar los **datos de ejemplo del Planificador** (`mocks/planificador.ts`) con las formas de la sección 7.1.
4. Empezar a redactar la **propuesta escrita del Planificador**: problema, a quién afecta, cómo lo resuelve y beneficios concretos (1 página).

### B1 — Calificaciones (`pages/Calificaciones.tsx`)
- Usa `useCalificaciones()` (periodo actual) **y** `useKardex()` (historial). Pon dos pestañas: **"Periodo actual"** e **"Historial"**.
- **Periodo actual**: una tarjeta por materia con clave, nombre, grupo, las 4 unidades (las vacías como "—"),
  el promedio parcial y una etiqueta "En curso". Color de la tarjeta según `desempeno`.
- **Historial**: tabla con materia, periodo (`periodoTexto`), tipo de curso y calificación final.
- **Filtro en tiempo real**: un input que busca por nombre o clave, y un `<select>` de periodo (`kardex.periodos`).
  Filtrar con `useMemo` en cada tecla, sin botón de "buscar".
- **Colores**: verde ≥ 90, amarillo 70–89, rojo < 70, gris sin datos. "AC" cuenta como verde.
- Estados: skeleton mientras carga y `ErrorState` (componente de A) si falla.

### B2 — Kardex (`pages/Kardex.tsx`)
- Arriba, **tarjetas resumen**: % de avance (barra), créditos acreditados, promedio general, materias en repetición o especial.
- **Gráfica de línea** (Recharts) del promedio por semestre (`kardex.semestres[].promedio`).
- **Secciones por semestre** que se abren y cierran, cada una con su tabla (clave, materia, periodo, créditos, calificación, tipo).
  Badge de tipo: Ordinario (neutro), Repetición (ámbar), Especial (rojo). Las no acreditadas, en rojo con "NA".
- Las materias cursadas varias veces aparecen varias veces (es correcto: el kardex guarda cada intento).

### B3 — Planificador, frontend (`pages/planificador/`)
- **Mapa** (`Mapa.tsx`): React Flow, columnas por `semestreSugerido`, nodos coloreados por `estado`, aristas desde los `requisitos`.
  Al hacer clic en un nodo, un panel lateral muestra los detalles, los intentos y qué la bloquea.
- **Avance** (`Avance.tsx`): resumen, barra de créditos, egreso estimado y lista de alertas por nivel.
- **Generador** (`Generador.tsx`): checklist de materias disponibles, preferencias, botón "Generar" y la lista de opciones,
  cada una mostrada con el componente **`HorarioGrid`** de A (el mismo de la página Horario).
- **Panel admin** (`pages/admin/`): login de admin y tablas CRUD de materias (con selector múltiple de requisitos),
  oferta (con editor de bloques por día) y planes.

### B4 — Entregables
- `README.md`: descripción, tecnologías y su justificación, arquitectura (diagrama de la sección 3),
  instalación (sección 9), credenciales mock, **capturas** de cada pantalla y links del despliegue.
- Propuesta escrita del Planificador.

---

## 11. Tareas de A (para que B sepa qué esperar)

1. **Esqueleto del frontend**: Vite + TS + Tailwind + React Router + TanStack Query; `api/cliente.ts`
   (fetch con `credentials: "include"` y redirección al login con `SESION_*`); hooks `useEstudiante`,
   `useCalificaciones`, `useKardex`, `useHorario`; componentes `Card`, `Skeleton`, `Badge`, `ErrorState`; `AppLayout`; rutas con páginas vacías de B ya creadas. **Prioridad 1 para desbloquear a B.**
2. Login, rutas protegidas, dashboard, horario y `HorarioGrid`.
3. Backend del Planificador: Prisma + Neon, modelos, carga de la retícula de ISC, cálculo de estados, generador y rutas admin.
4. Despliegue: Render (backend), Vercel (frontend con rewrite), Neon (BD).

---

## 12. Cosas pendientes de decidir o conseguir

- [ ] Fecha de entrega y de la exposición: ______
- [ ] Conseguir la retícula oficial de ISC con su seriación (PDF de la coordinación).
- [ ] Confirmar que el SII responde desde Render (primera prueba al desplegar).
- [ ] Nombre final de la app (provisional: **SII Planner**).
- [ ] Grabar un video de respaldo de la demo, por si el SII se cae en la exposición.

## 13. Exposición (reparto)

- **A**: arquitectura, flujo de autenticación y seguridad del token, particularidades del SII, despliegue.
- **B**: React + Vite (ventajas), presentación de los datos académicos, el Planificador y su justificación.
- **Demo en vivo**: uno opera la app y el otro narra.
